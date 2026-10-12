"""Orbit promo BGM — 120 BPM, D minor, 78 s. Synthesized from scratch with numpy/scipy.
Section map (seconds) mirrors the video timeline:
  0-8   Hook       : clock ticks, dark pad, heartbeat
  8-16  Pain       : pulse bass, filter opening, glitch stabs on each line
  16-20 Build      : riser + snare roll, hard silence 19.5-20
  20-60 Drop/Demo  : full beat, supersaw, arp, whooshes on scene cuts, pings on tiles
  60-68 Breakdown  : EP piano + pad, emotional
  68-74 Finale     : full beat again
  74-78 Outro      : D major resolve, reverb tail
"""
import numpy as np
from scipy import signal
import wave, sys

SR = 44100
DUR = 78.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM          # 0.5 s
BAR = BEAT * 4           # 2.0 s
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)
bus = {k: np.zeros((2, N)) for k in ['drums', 'bass', 'chords', 'arp', 'pad', 'fx', 'keys']}

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def idx(t): return int(round(t * SR))

def add(name, t0, sig, pan=0.0, gain=1.0):
    i0 = idx(t0)
    if i0 >= N: return
    if sig.ndim == 1:
        lg = np.cos((pan + 1) * np.pi / 4); rg = np.sin((pan + 1) * np.pi / 4)
        sig = np.vstack([sig * lg, sig * rg]) * np.sqrt(2)
    n = min(sig.shape[1], N - i0)
    if i0 < 0:
        sig = sig[:, -i0:]; n = min(sig.shape[1], N); i0 = 0
    bus[name][:, i0:i0 + n] += sig[:, :n] * gain

def env_adsr(n, a, d, s, r, sustain_len):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, int(sustain_len * SR) - a_n - d_n)
    e = np.concatenate([np.linspace(0, 1, max(a_n, 1)), np.linspace(1, s, max(d_n, 1)),
                        np.full(s_n, s), np.linspace(s, 0, max(r_n, 1))])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))

def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + phase) % 1.0) - 1

def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x)

def hp(x, fc, order=2):
    sos = signal.butter(order, fc / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x)

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x)

# ---------------------------------------------------------------- instruments
def kick(gain=1.0, soft=False):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * (28 if not soft else 18))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * (7 if not soft else 9))
    click = np.exp(-t * 400) * rng.standard_normal(n) * (0.25 if not soft else 0.05)
    return np.tanh((body + click) * 1.6) * gain

def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 4200)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        o = int(off * SR); e[o:] += np.exp(-(t[: n - o]) * (90 if k < 2 else 16))
    return nz * e * 0.6

def hat(open_=False):
    n = int((0.25 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t * (14 if open_ else 90)) * 0.35

def snare():
    n = int(0.25 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    nz = bp(rng.standard_normal(n), 1500, 8000) * np.exp(-t * 22)
    return (tone * 0.5 + nz * 0.7) * 0.6

def tick():
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3200 * t) + 0.5 * np.sin(2 * np.pi * 5100 * t)) * np.exp(-t * 260) * 0.25

def supersaw(notes, dur, cutoff=3500, voices=7, detune=0.18):
    n = int((dur + 0.4) * SR)
    out = np.zeros((2, n))
    for m in notes:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2)
            f = midi(m + d * detune)
            s = saw(f, n, rng.random())
            pan = d * 0.8
            out[0] += s * np.cos((pan + 1) * np.pi / 4); out[1] += s * np.sin((pan + 1) * np.pi / 4)
    e = env_adsr(n, 0.01, 0.3, 0.75, 0.35, dur)
    out = np.vstack([lp(out[0], cutoff), lp(out[1], cutoff)]) * e / (voices * len(notes)) * 1.6
    return out

def pad(notes, dur, cutoff=1400, a=0.8, r=1.2):
    n = int((dur + r) * SR)
    out = np.zeros((2, n))
    for m in notes:
        for v, dt in enumerate([-0.09, 0.0, 0.11]):
            s = saw(midi(m + dt), n, rng.random())
            out[v % 2] += s; out[(v + 1) % 2] += s * 0.6
    e = env_adsr(n, a, 0.5, 0.85, r, dur)
    return np.vstack([lp(out[0], cutoff), lp(out[1], cutoff)]) * e / (3 * len(notes))

def pluck(m, dur=0.22, bright=1.0):
    n = int((dur + 0.3) * SR); t = np.arange(n) / SR
    f = midi(m); s = np.zeros(n)
    for h in range(1, 14):
        if f * h > 15000: break
        s += np.sin(2 * np.pi * f * h * t) / h * np.exp(-t * (6 + h * 7 / bright))
    return s * 0.45

def ep(m, dur=1.8):
    """electric-piano-ish: FM bell + body"""
    n = int((dur + 1.2) * SR); t = np.arange(n) / SR
    f = midi(m)
    mod = np.sin(2 * np.pi * f * 2 * t) * 1.4 * np.exp(-t * 3)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.1)
    s += 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 6)
    return s * 0.28

def bass_note(m, dur, cutoff=420):
    n = int((dur + 0.05) * SR); t = np.arange(n) / SR
    s = lp(saw(midi(m), n) * 0.6, cutoff) + np.sin(2 * np.pi * midi(m) * t) * 0.7
    e = env_adsr(n, 0.004, 0.08, 0.8, 0.04, dur)
    return np.tanh(s * e * 1.4) * 0.55

def whoosh(dur=1.0, rev=False):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    # sweep bandpass by chunking
    out = np.zeros(n); chunks = 40
    for c in range(chunks):
        a, b = c * n // chunks, (c + 1) * n // chunks
        p = c / chunks
        fc = 400 + 6000 * (p if not rev else 1 - p)
        out[a:b] = bp(nz[a:b], fc * 0.6, min(fc * 1.6, 18000))
    e = np.sin(np.pi * t / dur) ** 2
    return out * e * 0.45

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    p = t / dur
    nz = rng.standard_normal(n)
    out = np.zeros(n); chunks = 60
    for c in range(chunks):
        a, b = c * n // chunks, (c + 1) * n // chunks
        fc = 300 + 9000 * (c / chunks) ** 2
        out[a:b] = bp(nz[a:b], fc * 0.5, min(fc * 1.5, 19000))
    f = 200 + 1400 * p ** 2
    tone = saw(1, n) * 0  # placeholder
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    return (out * 0.5 + tone) * p ** 2.2

def impact():
    n = int(3.5 * SR); t = np.arange(n) / SR
    f = 30 + 90 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    crash = hp(rng.standard_normal(n), 3000) * np.exp(-t * 1.3) * 0.35
    return np.tanh(boom * 1.8) * 0.9 + crash

def ping(m):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = midi(m)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 3.2) * 0.25

def glitch():
    n = int(0.18 * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * (800 + 2400 * rng.random()) * t)) * 0.2
    s *= (np.floor(t * 60) % 2)  # stutter gate
    s += bp(rng.standard_normal(n), 2000, 9000) * 0.25
    return s * np.exp(-t * 14)

def heartbeat():
    a = kick(0.55, soft=True)
    b = kick(0.4, soft=True)
    out = np.zeros(int(0.7 * SR))
    out[:len(a)] += a[:len(out)]
    o = int(0.22 * SR); out[o:o + len(b)] += b[:len(out) - o]
    return lp(out, 160)

# ---------------------------------------------------------------- harmony
# Dm  Bb  F  C   (i VI III VII)
PROG = [
    (50, [62, 65, 69]),   # Dm  (bass D3)
    (46, [62, 65, 70]),   # Bb
    (53, [60, 65, 69]),   # F
    (48, [60, 64, 67]),   # C
]
def chord_at(bar): return PROG[bar % 4]

# ---------------------------------------------------------------- arrangement
# Hook 0-8: ticks, pad, heartbeat
for b in range(16):
    add('fx', b * BEAT, tick(), pan=0.3 * (1 if b % 2 else -1), gain=0.8)
add('pad', 0.0, pad([50, 57, 62, 65], 8.0, cutoff=700, a=2.5, r=1.5), gain=0.55)
for t in [4.0, 5.0, 6.0, 7.0]:
    add('drums', t, heartbeat(), gain=0.9)

# Pain 8-16: pulse bass 8ths, ticks, pad progression, glitch per line
for bar in range(4, 8):
    t0 = bar * BAR
    root, ch = chord_at(bar - 4)
    cut = 500 + (bar - 4) * 350
    add('pad', t0, pad(ch, BAR, cutoff=cut + 300, a=0.3, r=0.6), gain=0.45)
    for e in range(8):
        add('bass', t0 + e * BEAT / 2, bass_note(root, 0.2, cutoff=cut), gain=0.7)
    for b in range(4):
        add('fx', t0 + b * BEAT, tick(), gain=0.6)
    add('drums', t0, kick(0.6, soft=True))
    add('drums', t0 + BAR / 2, kick(0.5, soft=True))
for t in [8.0, 10.0, 12.0, 14.0]:
    add('fx', t, glitch(), pan=rng.uniform(-0.6, 0.6), gain=0.9)

# Build 16-19.5: riser + snare roll; collapse
add('fx', 16.0, riser(3.5), gain=0.9)
add('pad', 16.0, pad([50, 57, 62, 64], 3.4, cutoff=1800, a=0.6, r=0.1), gain=0.45)
t = 16.0; step = BEAT
while t < 19.45:
    add('drums', t, snare(), gain=0.25 + 0.6 * (t - 16) / 3.5)
    if t >= 18.0: step = BEAT / 4
    elif t >= 17.0: step = BEAT / 2
    t += step
for e in range(int(3.5 / (BEAT / 2))):
    tt = 16 + e * BEAT / 2
    add('bass', tt, bass_note(50, 0.2, cutoff=500 + e * 70), gain=0.6)
# hard silence 19.5-20 handled by gating at the end

# Drop & Demo 20-60 / Finale 68-74
def beat_section(b0, b1, arp=True, chords=True, full=True):
    for bar in range(b0, b1):
        t0 = bar * BAR
        root, ch = chord_at(bar - b0)
        # drums
        for b in range(4):
            add('drums', t0 + b * BEAT, kick(0.95))
            if b % 2 == 1: add('drums', t0 + b * BEAT, clap(), gain=0.8)
            add('drums', t0 + b * BEAT + BEAT / 2, hat(open_=True), pan=0.2, gain=0.55)
            for s in range(4):
                if s != 2: add('drums', t0 + b * BEAT + s * BEAT / 4, hat(), pan=-0.25, gain=0.35 + 0.15 * (s % 2))
        # bass: offbeat 8ths + root
        for e in range(8):
            m = root if e % 2 else root - 12
            add('bass', t0 + e * BEAT / 2, bass_note(m, 0.22, cutoff=650), gain=0.75)
        if chords:
            add('chords', t0, supersaw([n + 12 for n in ch] + [ch[0]], BAR - 0.05, cutoff=4200), gain=0.55)
        if arp:
            pat = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 2]
            notes = [ch[i] + 24 for i in range(3)]
            for s in range(16):
                m = notes[pat[s]] + (12 if s in (6, 14) else 0)
                add('arp', t0 + s * BEAT / 4, pluck(m, bright=1.4), pan=0.45 * np.sin(s * 0.7), gain=0.5)

add('fx', 20.0, impact(), gain=1.0)
beat_section(10, 30)            # 20 - 60 s
# melody lead on top during demo (simple hook motif, bars 14-29)
MOTIF = [(0, 74, 1.0), (1.0, 72, 0.5), (1.5, 69, 0.5), (2.0, 74, 0.75), (2.75, 77, 0.75), (3.5, 76, 0.5),
         (4.0, 74, 1.0), (5.0, 72, 0.5), (5.5, 70, 0.5), (6.0, 69, 1.5), (7.5, 67, 0.5)]
for rep in [28.0, 36.0, 44.0, 52.0]:
    for off, m, d in MOTIF:
        d = d * BEAT
        n = int((d + 0.3) * SR); tt = np.arange(n) / SR
        f = midi(m)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt) * np.clip(tt * 3, 0, 1)
        s = lp(saw(f, n) * 0.5 + saw(f * 1.004, n) * 0.5, 3000) * 0.0
        ph = 2 * np.pi * np.cumsum(f * vib) / SR
        s = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * env_adsr(n, 0.02, 0.1, 0.8, 0.25, d)
        add('keys', rep + off * BEAT, s * 0.2, pan=0.1)
# whooshes on scene cuts, pings on value tiles
for t in [27.2, 35.2, 43.2, 51.2]:
    add('fx', t, whoosh(0.8), gain=0.9)
for t, m in [(52.0, 81), (54.0, 84), (56.0, 88), (58.0, 86)]:
    add('fx', t, ping(m), pan=rng.uniform(-0.4, 0.4), gain=0.9)

# Breakdown 60-68: EP + pad, no drums; riser 66-68
BD = [(46, [62, 65, 70, 74]), (48, [64, 67, 72, 76]), (50, [62, 65, 69, 74]), (53, [60, 65, 69, 72])]
for i, (root, ch) in enumerate(BD):
    t0 = 60 + i * BAR
    add('pad', t0, pad([root, root + 7] + ch, BAR, cutoff=1600, a=0.4, r=1.0), gain=0.5)
    for k, m in enumerate(ch):
        add('keys', t0 + k * 0.06, ep(m, 1.8), pan=-0.3 + k * 0.2, gain=0.9)
    add('keys', t0 + 1.0, ep(ch[-1] + 12, 0.9), pan=0.3, gain=0.5)
    add('bass', t0, np.sin(2 * np.pi * midi(root - 12) * np.arange(int(BAR * SR)) / SR) *
        env_adsr(int(BAR * SR), 0.05, 0.3, 0.8, 0.3, BAR), gain=0.35)
for t in [64.0, 65.0, 66.0, 66.5, 67.0, 67.25, 67.5, 67.75]:
    add('drums', t, kick(0.5, soft=True), gain=0.6)
add('fx', 66.0, riser(2.0), gain=0.8)

# Finale 68-74 then outro
add('fx', 68.0, impact(), gain=1.0)
beat_section(34, 37)            # 68 - 74 s
# outro: D major resolve (Picardy surprise) 74-78
add('chords', 74.0, supersaw([62, 66, 69, 74, 78], 2.5, cutoff=2500), gain=0.5)
add('pad', 74.0, pad([38, 50, 57, 62, 66], 2.6, cutoff=1500, a=0.05, r=1.4), gain=0.6)
add('drums', 74.0, kick(1.0))
add('fx', 74.0, impact(), gain=0.6)
for k, m in enumerate([74, 78, 81, 86]):
    add('keys', 74.0 + k * 0.12, ep(m, 2.5), pan=-0.3 + k * 0.2, gain=0.8)

# ---------------------------------------------------------------- mix
def sidechain(t_kicks, depth=0.6, rel=0.18):
    g = np.ones(N)
    tt = np.arange(int(rel * 2 * SR)) / SR
    shape = 1 - depth * np.exp(-tt / (rel / 3))
    for t in t_kicks:
        i = idx(t); n = min(len(shape), N - i)
        g[i:i + n] = np.minimum(g[i:i + n], shape[:n])
    return g

kicks = [b * BEAT for b in range(40, 120)] + [b * BEAT for b in range(136, 148)]
sc = sidechain(kicks)

def reverb(x, secs=2.4, mix=0.25, seed=1):
    r = np.random.default_rng(seed)
    n = int(secs * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-t * 3.2 / secs * 2.2)
        ir = lp(ir, 6000); ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
        ir /= np.sqrt(np.sum(ir ** 2))
        wet = signal.fftconvolve(x[ch], ir)[:N]
        out.append(x[ch] * (1 - mix) + wet * mix * 1.2)
    return np.array(out)

mix = np.zeros((2, N))
mix += bus['drums'] * 0.9
mix += bus['bass'] * sc * 0.85
mix += reverb(bus['chords'], mix=0.3, seed=2) * sc * 0.75
mix += reverb(bus['arp'], mix=0.35, seed=3) * (0.6 + 0.4 * sc) * 0.6
mix += reverb(bus['pad'], secs=3.5, mix=0.45, seed=4) * (0.5 + 0.5 * sc) * 0.8
mix += reverb(bus['keys'], secs=3.0, mix=0.4, seed=5) * 0.9
mix += reverb(bus['fx'], secs=2.0, mix=0.3, seed=6) * 0.85

# hard silence for the surprise beat (19.5 - 20.0), short fades to avoid clicks
g = np.ones(N)
a, b = idx(19.5), idx(20.0); f = int(0.012 * SR)
g[a:b] = 0; g[a - f:a] = np.linspace(1, 0, f)
mix *= g
# breakdown dip for contrast
auto = np.interp(np.arange(N)/SR, [0,60.0,60.6,65.0,67.95,68.0,DUR], [1,1,0.42,0.48,0.75,1,1])
mix *= auto
# master fade out
fo = idx(DUR - 2.2); mix[:, fo:] *= np.linspace(1, 0, N - fo) ** 1.5
# glue: gentle saturation + normalize
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix /= np.max(np.abs(mix)) * 1.08
out = (mix.T * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'bgm.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok', out.shape)
