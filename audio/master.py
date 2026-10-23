"""Streaming-ready master of a mixdown (JSON report on stdout), for master_audio.

Chain: high-pass, gentle tonal balance, glue compression, gain to the target
loudness, limiter, then a true-peak check (4x oversampled) that pulls the gain
back until the ceiling holds. Runs locally.
Usage: python master.py <in.wav> <out.wav> [target_lufs=-14] [ceiling_dbtp=-1]
"""
import json
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Compressor, HighpassFilter, HighShelfFilter, Limiter, LowShelfFilter, Pedalboard
from scipy.signal import resample_poly


def true_peak_db(x):
    up = resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def stats(x, sr):
    meter = pyln.Meter(sr)
    lufs = meter.integrated_loudness(x)
    # Loudness range (approx.): spread of short-term loudness over 3 s windows.
    win, hop = 3 * sr, sr
    st = [meter.integrated_loudness(x[i:i + win]) for i in range(0, max(1, len(x) - win), hop)]
    st = [v for v in st if np.isfinite(v) and v > lufs - 20]
    lra = float(np.percentile(st, 95) - np.percentile(st, 10)) if len(st) > 2 else 0.0
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    peak = 20 * np.log10(np.abs(x).max() + 1e-12)
    return {'lufs': round(float(lufs), 1), 'true_peak_dbtp': round(float(true_peak_db(x)), 2),
            'loudness_range_lu': round(lra, 1), 'crest_db': round(float(peak - rms), 1)}


def main():
    src, dst = sys.argv[1], sys.argv[2]
    target = float(sys.argv[3]) if len(sys.argv) > 3 else -14.0
    ceiling = float(sys.argv[4]) if len(sys.argv) > 4 else -1.0
    x, sr = sf.read(src, dtype='float32', always_2d=True)
    before = stats(x, sr)

    tone = Pedalboard([
        HighpassFilter(28),
        LowShelfFilter(cutoff_frequency_hz=90, gain_db=0.8, q=0.7),
        HighShelfFilter(cutoff_frequency_hz=11000, gain_db=1.2, q=0.7),
        Compressor(threshold_db=-18, ratio=1.8, attack_ms=30, release_ms=200),
    ])
    y = tone(x.T, sr).T

    meter = pyln.Meter(sr)
    gain = target - meter.integrated_loudness(y)
    limit_at = ceiling - 0.3
    for _ in range(8):
        # The limiter raises its threshold to 0 dBFS; scale back so limit_at is the real ceiling.
        out = Pedalboard([Limiter(threshold_db=limit_at, release_ms=80)])((y * 10 ** (gain / 20)).T, sr).T * 10 ** (limit_at / 20)
        tp, lufs = true_peak_db(out), meter.integrated_loudness(out)
        if tp > ceiling:
            limit_at -= tp - ceiling + 0.1
        elif abs(lufs - target) > 0.3:
            gain += target - lufs
        else:
            break
    sf.write(dst, out, sr, subtype='PCM_24')
    after = stats(out, sr)
    print(json.dumps({'file': dst, 'sample_rate': sr, 'bit_depth': 24, 'before': before, 'after': after,
                      'target_lufs': target, 'ceiling_dbtp': ceiling}))


if __name__ == '__main__':
    main()
