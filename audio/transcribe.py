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
PARTS = {'vocals': 'Melody', 'bass': 'Bass', 'other': 'Chords', 'guitar': 'Guitar', 'piano': 'Piano'}


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
    demucs.separate.main(['-n', 'htdemucs', '-o', str(work), str(audio)])
    return work / 'htdemucs' / Path(audio).stem


def pitched(path, bpm, bass):
    from basic_pitch.inference import predict
    _, _, events = predict(str(path), minimum_frequency=30 if bass else 60,
                           maximum_frequency=400 if bass else None, minimum_note_length=80)
    spb = 60.0 / bpm
    return [{'pitch': int(p), 'start': round(s / spb, 3), 'duration': round(max(e - s, 0.05) / spb, 3),
             'velocity': int(max(20, min(127, a * 127)))} for s, e, p, a, *_ in events]


def drums(path, bpm):
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, units='samples', backtrack=True)
    spb = 60.0 / bpm
    peak = np.abs(y).max() or 1.0
    notes = []
    for o in onsets:
        seg = y[o:o + 2048]
        if len(seg) < 512:
            continue
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        freqs = np.fft.rfftfreq(len(seg), 1 / sr)
        low, mid, high = (spec[(freqs >= a) & (freqs < b)].sum() for a, b in ((20, 150), (150, 2500), (5000, 11000)))
        pitch = 36 if low > mid and low > high else 42 if high > mid else 38
        vel = int(max(30, min(127, np.abs(seg).max() / peak * 127)))
        notes.append({'pitch': pitch, 'start': round(o / sr / spb, 3), 'duration': 0.25, 'velocity': vel})
    return notes


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
        tracks.append({'name': 'Notes', 'notes': pitched(audio, bpm, False)})
    else:
        log('separating stems (Demucs)...')
        stems = separate(audio, work)
        for stem in ('vocals', 'bass', 'other'):
            f = stems / f'{stem}.wav'
            if f.exists():
                log(f'transcribing {stem}...')
                notes = pitched(f, bpm, stem == 'bass')
                if notes:
                    tracks.append({'name': PARTS[stem], 'notes': notes})
        if (stems / 'drums.wav').exists():
            log('transcribing drums...')
            tracks.append({'name': 'Drums', 'notes': drums(stems / 'drums.wav', bpm)})
    out.write(json.dumps({'bpm': bpm, 'key': key, 'tracks': tracks}))


if __name__ == '__main__':
    main()
