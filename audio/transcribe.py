"""Audio -> per-instrument notes (JSON on stdout), for audio_to_midi.

Separates the song into stems with Demucs, transcribes pitched stems with
Basic Pitch and drums with onset detection, and estimates tempo and key.
Everything runs locally. Usage: python transcribe.py <audio> <work_dir> [--no-stems]
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
PARTS = {'vocals': 'Melody', 'bass': 'Bass', 'guitar': 'Guitar', 'piano': 'Piano', 'other': 'Synth / Other'}
# Basic Pitch settings per stem: (min Hz, max Hz, onset threshold, frame threshold, min note ms)
STEM_CFG = {
    'vocals': (80, 1400, 0.6, 0.4, 90),
    'bass': (30, 330, 0.5, 0.35, 90),
    'guitar': (75, 1600, 0.55, 0.35, 70),
    'piano': (27, 4200, 0.5, 0.3, 60),
    'other': (40, 4200, 0.65, 0.45, 100),
}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def analyze(y, sr):
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(np.atleast_1d(tempo)[0]) or 120.0
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    best = max(((np.corrcoef(np.roll(prof, i), chroma)[0, 1], NAMES[i], mode)
                for prof, mode in ((MAJOR, 'major'), (MINOR, 'minor')) for i in range(12)))
    return round(bpm, 1), {'tonic': best[1], 'mode': best[2]}


def separate(audio, work):
    import demucs.separate
    # Best of both: the fine-tuned 4-stem model is cleanest for vocals, drums and bass;
    # the 6-stem model adds guitar and piano. 'other' then comes from the 6-stem split.
    name = Path(audio).stem
    for model in ('htdemucs_ft', 'htdemucs_6s'):
        demucs.separate.main(['-n', model, '--shifts', '4', '--overlap', '0.5', '-o', str(work), str(audio)])
    ft, six = work / 'htdemucs_ft' / name, work / 'htdemucs_6s' / name
    return {'vocals': ft / 'vocals.wav', 'drums': ft / 'drums.wav', 'bass': ft / 'bass.wav',
            'guitar': six / 'guitar.wav', 'piano': six / 'piano.wav', 'other': six / 'other.wav'}


def audible(path, mix_rms):
    y, _ = librosa.load(str(path), sr=11025, mono=True)
    return float(np.sqrt(np.mean(y ** 2))) > mix_rms * 0.06


def pitched(path, bpm, stem):
    from basic_pitch.inference import predict
    lo, hi, onset, frame, min_ms = STEM_CFG.get(stem, STEM_CFG['other'])
    _, _, events = predict(str(path), onset_threshold=onset, frame_threshold=frame, minimum_note_length=min_ms,
                           minimum_frequency=lo, maximum_frequency=hi, multiple_pitch_bends=False)
    spb = 60.0 / bpm
    notes = sorted(({'pitch': int(p), 'start': round(s / spb, 3), 'duration': round(max(e - s, 0.05) / spb, 3),
                     'velocity': int(max(20, min(127, a * 127)))} for s, e, p, a, *_ in events), key=lambda n: n['start'])
    if stem in ('bass', 'vocals'):
        notes = monophonic(notes)
    return notes


def monophonic(notes):
    # Bass lines and lead vocals are one note at a time: keep the loudest of overlapping notes.
    out = []
    for n in notes:
        if out and n['start'] < out[-1]['start'] + out[-1]['duration'] - 0.05:
            if n['start'] - out[-1]['start'] < 0.1:
                if n['velocity'] > out[-1]['velocity']:
                    out[-1] = n
                continue
            out[-1]['duration'] = round(n['start'] - out[-1]['start'], 3)
        out.append(n)
    return out


def drums(path, bpm):
    # Kick, snare and hats each get their own band and onset detection, so hits that
    # land together (kick + hat) are all found.
    from scipy.signal import butter, sosfiltfilt
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    spb = 60.0 / bpm
    bands = [  # (GM note, filter, delta, min gap s)
        (36, butter(4, 110, 'lowpass', fs=sr, output='sos'), 0.12, 0.09),
        (38, butter(4, [180, 3500], 'bandpass', fs=sr, output='sos'), 0.15, 0.09),
        (42, butter(4, 7000, 'highpass', fs=sr, output='sos'), 0.10, 0.05),
    ]
    notes = []
    for pitch, sos, delta, gap in bands:
        x = sosfiltfilt(sos, y)
        env = librosa.onset.onset_strength(y=x, sr=sr, hop_length=256)
        frames = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=256, delta=float(delta * env.max() / 2),
                                            wait=int(gap * sr / 256), units='frames')
        peak = env.max() or 1.0
        for f in frames:
            t = f * 256 / sr
            notes.append({'pitch': pitch, 'start': round(t / spb, 3), 'duration': 0.25,
                          'velocity': int(max(35, min(127, env[f] / peak * 127)))})
    notes.sort(key=lambda n: n['start'])
    return notes


DRUMSEP_MODEL = 'MDX23C-DrumSep-aufr33-jarredou.ckpt'  # weights' license is undocumented: opt-in only
# Onset thresholds (envelope normalised to 0–1); toms and cymbals pick up bleed, so need more.
DRUMSEP_DELTA = {'kick': 0.07, 'snare': 0.07, 'hh': 0.07, 'toms': 0.2, 'ride': 0.2, 'crash': 0.25}
DRUMSEP_NOTES = {'kick': 36, 'snare': 38, 'toms': 47, 'hh': 42, 'ride': 51, 'crash': 49}


def drumsep(path, bpm, work):
    # Splits the drum stem into kick, snare, toms, hi-hat, ride and crash, then finds
    # the hits on each piece separately.
    from audio_separator.separator import Separator
    out = work / 'drumsep' / Path(path).parent.name
    out.mkdir(parents=True, exist_ok=True)
    sep = Separator(output_dir=str(out), model_file_dir=str(work.parent / 'models' / 'separator'), output_format='WAV')
    sep.load_model(DRUMSEP_MODEL)
    sep.separate(str(path), {k.capitalize(): k for k in DRUMSEP_NOTES} | {k: k for k in DRUMSEP_NOTES})
    spb = 60.0 / bpm
    notes = []
    for piece in DRUMSEP_NOTES:
        f = out / f'{piece}.wav'
        if not f.exists():
            continue
        y, sr = librosa.load(str(f), sr=22050, mono=True)
        if np.sqrt(np.mean(y ** 2)) < 1e-3:
            continue
        env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
        gap = 0.05 if piece == 'hh' else 0.08
        frames = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=256, delta=DRUMSEP_DELTA[piece],
                                            wait=int(gap * sr / 256), units='frames')
        peak = env.max() or 1.0
        for fr in frames:
            notes.append({'pitch': DRUMSEP_NOTES[piece], 'start': round(fr * 256 / sr / spb, 3), 'duration': 0.25,
                          'velocity': int(max(35, min(127, env[fr] / peak * 127)))})
    return sorted(notes, key=lambda n: n['start'])


def main():
    out = sys.stdout
    sys.stdout = sys.stderr  # libraries print progress; keep stdout for JSON
    audio, work = Path(sys.argv[1]), Path(sys.argv[2])
    work.mkdir(parents=True, exist_ok=True)
    y, sr = librosa.load(str(audio), sr=22050, mono=True)
    bpm, key = analyze(y, sr)
    log(f'tempo {bpm} BPM, key {key["tonic"]} {key["mode"]}')
    tracks = []
    if '--no-stems' in sys.argv:
        tracks.append({'name': 'Notes', 'notes': pitched(audio, bpm, 'other')})
    else:
        log('separating stems (Demucs)...')
        stems = separate(audio, work)
        mix_rms = float(np.sqrt(np.mean(y ** 2)))
        for stem in ('vocals', 'bass', 'guitar', 'piano', 'other'):
            f = stems[stem]
            if f.exists() and audible(f, mix_rms):
                log(f'transcribing {stem}...')
                notes = pitched(f, bpm, stem)
                if notes:
                    tracks.append({'name': PARTS[stem], 'notes': notes})
        if stems['drums'].exists():
            log('transcribing drums...')
            tracks.append({'name': 'Drums', 'notes': drumsep(stems['drums'], bpm, work) if '--drumsep' in sys.argv else drums(stems['drums'], bpm)})
    out.write(json.dumps({'bpm': bpm, 'key': key, 'tracks': tracks}))


if __name__ == '__main__':
    main()
