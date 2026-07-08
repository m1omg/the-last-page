#!/usr/bin/env python3
"""make_audio.py — synthesize all BGM and SFX for "The Last Page".

Pure Python (math + wave + array, no numpy). Every melody is original,
composed in a soft toy-piano / music-box / lo-fi lane. BGM tracks render
with wrap-around note tails so they loop seamlessly.
"""
import math
import random
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio"
OUT.mkdir(parents=True, exist_ok=True)

SR = 22050
TWO_PI = 2.0 * math.pi

NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def freq(name):
    """'C4' / 'F#3' / 'Bb2' -> Hz."""
    letter = name[0]
    rest = name[1:]
    semi = NOTE_INDEX[letter]
    if rest[0] == "#":
        semi += 1
        rest = rest[1:]
    elif rest[0] == "b":
        semi -= 1
        rest = rest[1:]
    octave = int(rest)
    midi = 12 * (octave + 1) + semi
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def new_buf(seconds):
    return array("f", bytes(4 * int(seconds * SR)))


def write_wav(path, buf, gain=0.9):
    peak = max(1e-9, max(abs(s) for s in buf))
    scale = gain * 32767.0 / peak
    pcm = array("h", (int(max(-32767, min(32767, s * scale))) for s in buf))
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote {path.name}  ({len(buf)/SR:.1f}s)")


# ---------------------------------------------------------------- instruments
# Each instrument renders one note additively into buf, wrapping around the
# buffer end (seamless loops). vel is 0..1.

def render(buf, start_s, f, dur, vel, timbre, wrap=True, echo=0.0):
    n0 = int(start_s * SR)
    total = int(dur * SR)
    ln = len(buf)
    for i in range(total):
        t = i / SR
        s = timbre(f, t, dur) * vel
        idx = n0 + i
        if wrap:
            idx %= ln
        elif idx >= ln:
            break
        buf[idx] += s
    if echo > 0.0:
        d = int(0.28 * SR)
        for i in range(total):
            t = i / SR
            s = timbre(f, t, dur) * vel * echo
            idx = n0 + d + i
            if wrap:
                idx %= ln
            elif idx >= ln:
                break
            buf[idx] += s


def musicbox(f, t, dur):
    e = math.exp(-3.2 * t)
    a = min(1.0, t / 0.003)
    return a * (math.sin(TWO_PI * f * t) * e
                + 0.35 * math.sin(TWO_PI * 3.0 * f * t) * math.exp(-6.0 * t)
                + 0.12 * math.sin(TWO_PI * 5.4 * f * t) * math.exp(-9.0 * t))


def felt(f, t, dur):
    # soft felt piano: warm, muffled, slight detune shimmer
    e = math.exp(-1.7 * t)
    a = min(1.0, t / 0.006)
    d = f * 0.0012
    return a * e * (0.6 * math.sin(TWO_PI * (f - d) * t)
                    + 0.6 * math.sin(TWO_PI * (f + d) * t)
                    + 0.25 * math.sin(TWO_PI * 2.0 * f * t) * math.exp(-3.0 * t)
                    + 0.08 * math.sin(TWO_PI * 3.0 * f * t) * math.exp(-5.0 * t))


def pluck(f, t, dur):
    e = math.exp(-4.5 * t)
    a = min(1.0, t / 0.002)
    return a * e * (math.sin(TWO_PI * f * t)
                    + 0.5 * math.sin(TWO_PI * 2 * f * t)
                    + 0.22 * math.sin(TWO_PI * 3 * f * t) * math.exp(-8 * t))


def kalimba(f, t, dur):
    a = min(1.0, t / 0.002)
    return a * (math.sin(TWO_PI * f * t) * math.exp(-5.0 * t)
                + 0.5 * math.sin(TWO_PI * 6.27 * f * t) * math.exp(-22.0 * t))


def pad(f, t, dur):
    atk = 0.9
    rel = 1.2
    if t < atk:
        env = t / atk
    elif t > dur - rel:
        env = max(0.0, (dur - t) / rel)
    else:
        env = 1.0
    env *= 0.5 + 0.5 * math.sin(TWO_PI * 0.15 * t)  # slow breathing
    d = f * 0.004
    return env * (math.sin(TWO_PI * f * t)
                  + 0.7 * math.sin(TWO_PI * (f + d) * t)
                  + 0.7 * math.sin(TWO_PI * (f - d) * t)
                  + 0.3 * math.sin(TWO_PI * 2 * f * t)) * 0.25


def softsquare(f, t, dur):
    rel = 0.05
    env = min(1.0, t / 0.004) * (max(0.0, (dur - t) / rel) if t > dur - rel else 1.0)
    vib = 1.0 + 0.004 * math.sin(TWO_PI * 5.5 * t)
    ff = f * vib
    return env * 0.8 * (math.sin(TWO_PI * ff * t)
                        + 0.33 * math.sin(TWO_PI * 3 * ff * t)
                        + 0.2 * math.sin(TWO_PI * 5 * ff * t))


def accordion(f, t, dur):
    rel = 0.12
    env = min(1.0, t / 0.05) * (max(0.0, (dur - t) / rel) if t > dur - rel else 1.0)
    d = f * 0.006
    return env * 0.5 * (math.sin(TWO_PI * (f - d) * t) + math.sin(TWO_PI * (f + d) * t)
                        + 0.3 * math.sin(TWO_PI * 3 * f * t))


def subbass(f, t, dur):
    rel = 0.08
    env = min(1.0, t / 0.008) * (max(0.0, (dur - t) / rel) if t > dur - rel else 1.0)
    env *= math.exp(-1.2 * t)
    return env * (math.sin(TWO_PI * f * t) + 0.3 * math.sin(TWO_PI * 2 * f * t))


def drone(f, t, dur):
    atk, rel = 2.0, 2.0
    if t < atk:
        env = t / atk
    elif t > dur - rel:
        env = max(0.0, (dur - t) / rel)
    else:
        env = 1.0
    wob = 1.0 + 0.002 * math.sin(TWO_PI * 0.11 * t)
    return env * 0.3 * (math.sin(TWO_PI * f * wob * t)
                        + 0.6 * math.sin(TWO_PI * f * 0.5 * t)
                        + 0.4 * math.sin(TWO_PI * f * 1.01 * t))


_rand = random.Random(7)


def render_noise(buf, start_s, dur, vel, decay=12.0, lp=0.3, wrap=True):
    """soft filtered noise burst (percussion)."""
    n0 = int(start_s * SR)
    total = int(dur * SR)
    ln = len(buf)
    prev = 0.0
    for i in range(total):
        t = i / SR
        white = _rand.uniform(-1, 1)
        prev = prev + lp * (white - prev)
        idx = (n0 + i) % ln if wrap else n0 + i
        if not wrap and idx >= ln:
            break
        buf[idx] += prev * vel * math.exp(-decay * t)


def render_kick(buf, start_s, vel=0.8, wrap=True):
    n0 = int(start_s * SR)
    total = int(0.22 * SR)
    ln = len(buf)
    for i in range(total):
        t = i / SR
        f = 90.0 * math.exp(-9.0 * t) + 38.0
        idx = (n0 + i) % ln if wrap else n0 + i
        if not wrap and idx >= ln:
            break
        buf[idx] += vel * math.sin(TWO_PI * f * t) * math.exp(-11.0 * t)


# ---------------------------------------------------------------- sequencing
CHORDS = {
    "C": ["C", "E", "G"], "Cmaj7": ["C", "E", "G", "B"], "C7": ["C", "E", "G", "Bb"],
    "Dm": ["D", "F", "A"], "Dm7": ["D", "F", "A", "C"], "D": ["D", "F#", "A"],
    "Em": ["E", "G", "B"], "Em7": ["E", "G", "B", "D"], "E": ["E", "G#", "B"],
    "F": ["F", "A", "C"], "Fmaj7": ["F", "A", "C", "E"], "Fm": ["F", "Ab", "C"],
    "G": ["G", "B", "D"], "G7": ["G", "B", "D", "F"], "Gm": ["G", "Bb", "D"],
    "Am": ["A", "C", "E"], "Am7": ["A", "C", "E", "G"], "A": ["A", "C#", "E"],
    "Bb": ["Bb", "D", "F"], "Bdim": ["B", "D", "F"], "Bm": ["B", "D", "F#"],
    "Ab": ["Ab", "C", "Eb"], "Eb": ["Eb", "G", "Bb"], "Cm": ["C", "Eb", "G"],
}


def chord_notes(sym, octave):
    return [n + str(octave) for n in CHORDS[sym]]


class Song:
    def __init__(self, seconds, bpm):
        self.buf = new_buf(seconds)
        self.bpm = bpm
        self.beat = 60.0 / bpm

    def note(self, beat, name, dur_beats, vel, timbre, echo=0.0):
        render(self.buf, beat * self.beat, freq(name), dur_beats * self.beat,
               vel, timbre, echo=echo)

    def arp(self, beat, sym, octave, pattern, step, vel, timbre, dur=None, echo=0.0):
        notes = chord_notes(sym, octave)
        for k, pi in enumerate(pattern):
            nm = notes[pi % len(notes)]
            if pi >= len(notes):  # octave up wrap
                nm = nm[:-1] + str(int(nm[-1]) + 1)
            self.note(beat + k * step, nm, dur if dur else step * 1.8, vel, timbre, echo=echo)

    def chord(self, beat, sym, octave, dur_beats, vel, timbre, spread=0.03):
        for k, nm in enumerate(chord_notes(sym, octave)):
            self.note(beat + k * spread, nm, dur_beats, vel, timbre)


# The friendship theme — the game's leitmotif (original melody).
# (degree offsets are expressed directly as note names per key below)
THEME_C = [  # (beat, note, len_beats) in C major, 4/4, spans 16 beats
    (0, "E4", 1), (1, "G4", 1), (2, "A4", 1.5), (3.5, "G4", 0.5),
    (4, "E4", 1), (5, "D4", 1), (6, "C4", 2),
    (8, "E4", 1), (9, "G4", 1), (10, "C5", 1.5), (11.5, "B4", 0.5),
    (12, "A4", 1), (13, "G4", 0.5), (13.5, "A4", 0.5), (14, "G4", 2),
]


def transpose(theme, semis):
    out = []
    for b, n, d in theme:
        f0 = freq(n)
        # convert to nearest note name via midi
        midi = round(69 + 12 * math.log2(f0 / 440.0)) + semis
        names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
        out.append((b, names[midi % 12] + str(midi // 12 - 1), d))
    return out


# ---------------------------------------------------------------- BGM tracks

def bgm_title():
    s = Song(57.6, 100)  # 96 beats of 3/4 = 32 bars
    prog = ["Am", "F", "C", "G", "Am", "F", "G", "Am"] * 4
    for bar, sym in enumerate(prog):
        b = bar * 3
        notes = chord_notes(sym, 4)
        s.note(b, notes[0], 2.5, 0.5, musicbox, echo=0.25)
        s.note(b + 1, notes[1], 1.8, 0.35, musicbox, echo=0.25)
        s.note(b + 2, notes[2], 1.8, 0.3, musicbox, echo=0.25)
    # lullaby fragment of the theme, high and sparse, second half
    for b, n, d in transpose(THEME_C, -3):  # A minor coloring
        nm = n[:-1] + str(int(n[-1]) + 1)
        s.note(48 + b * 1.5, nm, d * 1.5, 0.5, musicbox, echo=0.3)
    render(s.buf, 0, freq("A2"), 57.6, 0.5, drone)
    write_wav(OUT / "bgm_title.wav", s.buf, 0.8)


def bgm_blank():
    s = Song(64.0, 60)
    render(s.buf, 0, freq("C3"), 32, 0.6, pad)
    render(s.buf, 32 * s.beat, freq("A2"), 32, 0.6, pad)
    sparse = [(0, "E5"), (5, "G5"), (9, "C5"), (16, "D5"), (21, "E5"),
              (26, "G4"), (32, "A4"), (37, "C5"), (41, "B4"), (48, "G4"),
              (53, "E4"), (58, "C4")]
    for b, n in sparse:
        s.note(b, n, 4, 0.5, felt, echo=0.3)
    write_wav(OUT / "bgm_blank.wav", s.buf, 0.75)


def bgm_real():
    s = Song(64.0, 60)
    prog = ["Em", "Cmaj7", "G", "D", "Em", "Cmaj7", "Am7", "Bm"]
    for bar, sym in enumerate(prog):
        b = bar * 8
        notes = chord_notes(sym, 3)
        s.note(b, notes[0], 6, 0.55, felt, echo=0.2)
        s.note(b + 3, notes[1], 4, 0.4, felt, echo=0.2)
        s.note(b + 5, notes[2], 3, 0.35, felt, echo=0.2)
    mel = [(8, "B4", 3), (12, "G4", 2), (16, "A4", 3), (20, "F#4", 2),
           (24, "G4", 3), (28, "E4", 4), (40, "B4", 2), (44, "C5", 3),
           (48, "A4", 2), (52, "F#4", 3), (56, "G4", 6)]
    for b, n, d in mel:
        s.note(b, n, d, 0.45, felt, echo=0.25)
    write_wav(OUT / "bgm_real.wav", s.buf, 0.75)


def bgm_meadow():
    s = Song(48.0, 120)
    prog = ["C", "G", "Am", "F"] * 6
    for bar, sym in enumerate(prog):
        b = bar * 4
        s.arp(b, sym, 4, [0, 2, 1, 2], 1.0, 0.4, pluck)
        s.note(b, chord_notes(sym, 2)[0], 1.5, 0.5, subbass)
        s.note(b + 2, chord_notes(sym, 2)[0], 1.0, 0.35, subbass)
        render_noise(s.buf, (b + 1) * s.beat, 0.08, 0.18, decay=30, lp=0.8)
        render_noise(s.buf, (b + 3) * s.beat, 0.08, 0.18, decay=30, lp=0.8)
    mel = [(0, "E5", 1), (1, "G5", 1), (2, "G5", 1.5), (3.5, "E5", 0.5),
           (4, "D5", 1), (5, "E5", 1), (6, "D5", 1.5), (7.5, "C5", 0.5),
           (8, "C5", 1), (9, "E5", 1), (10, "A4", 1.5), (11.5, "C5", 0.5),
           (12, "D5", 2), (14, "E5", 1), (15, "F5", 1),
           (16, "E5", 2), (18, "G5", 1), (19, "A5", 1),
           (20, "G5", 1.5), (21.5, "E5", 0.5), (22, "D5", 2),
           (24, "C5", 1), (25, "D5", 1), (26, "E5", 1.5), (27.5, "G4", 0.5),
           (28, "A4", 1), (29, "C5", 1), (30, "C5", 2)]
    for b, n, d in mel:
        s.note(b, n, d, 0.5, pluck, echo=0.18)
    for b, n, d in mel:
        if b < 16:
            s.note(32 + b, n, d, 0.35, kalimba, echo=0.2)
    write_wav(OUT / "bgm_meadow.wav", s.buf, 0.8)


def bgm_woods():
    s = Song(57.6, 100)
    prog = ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "A"] * 3
    for bar, sym in enumerate(prog):
        b = bar * 4
        s.arp(b, sym, 4, [0, 1, 2, 1, 3 if len(CHORDS[sym]) > 3 else 0, 2, 1, 2],
              0.5, 0.35, kalimba, echo=0.25)
        s.note(b, chord_notes(sym, 2)[0], 3.5, 0.4, subbass)
    render(s.buf, 0, freq("D3"), 28.8, 0.45, pad)
    render(s.buf, 28.8, freq("Bb2"), 28.8, 0.45, pad)
    mel = [(16, "A4", 2), (18, "F4", 1), (19, "G4", 1), (20, "A4", 3),
           (24, "D5", 2), (26, "C5", 1), (27, "A4", 1), (28, "Bb4", 4),
           (48, "A4", 2), (50, "Bb4", 1), (51, "C5", 1), (52, "D5", 4),
           (56, "C#5", 4)]
    for b, n, d in mel:
        s.note(b, n, d, 0.4, felt, echo=0.3)
    write_wav(OUT / "bgm_woods.wav", s.buf, 0.78)


def bgm_bay():
    s = Song(48.0, 90)  # 3/4 waltz, 24 bars
    prog = ["F", "Bb", "C", "F", "Dm", "Gm", "C7", "F"] * 3
    for bar, sym in enumerate(prog):
        b = bar * 3
        notes = chord_notes(sym, 3)
        s.note(b, notes[0], 1.2, 0.5, subbass)
        s.chord(b + 1, sym, 4, 0.8, 0.18, accordion)
        s.chord(b + 2, sym, 4, 0.8, 0.15, accordion)
    mel = [(0, "A4", 2), (2, "C5", 1), (3, "D5", 2), (5, "C5", 1),
           (6, "C5", 2), (8, "Bb4", 1), (9, "A4", 3),
           (12, "F4", 2), (14, "G4", 1), (15, "A4", 2), (17, "Bb4", 1),
           (18, "G4", 2), (20, "E4", 1), (21, "F4", 3),
           (24, "A4", 2), (26, "C5", 1), (27, "F5", 2), (29, "E5", 1),
           (30, "D5", 2), (32, "Bb4", 1), (33, "C5", 3),
           (36, "D5", 2), (38, "C5", 1), (39, "Bb4", 2), (41, "G4", 1),
           (42, "A4", 2), (44, "G4", 1), (45, "F4", 3)]
    for b, n, d in mel:
        s.note(b, n, d, 0.45, accordion, echo=0.15)
    write_wav(OUT / "bgm_bay.wav", s.buf, 0.78)


def bgm_depths():
    s = Song(64.0, 60)
    render(s.buf, 0, freq("C2"), 34, 0.8, drone)
    render(s.buf, 32, freq("Ab1"), 34, 0.8, drone)
    # heartbeat
    for bar in range(16):
        t = bar * 4 * s.beat
        render_kick(s.buf, t, 0.45)
        render_kick(s.buf, t + 0.32, 0.3)
    # lost, detuned theme fragments
    frag = [(6, "Eb4", 3), (14, "D4", 3), (22, "C4", 4),
            (38, "Ab4", 3), (46, "G4", 3), (54, "Eb4", 5)]
    for b, n, d in frag:
        s.note(b, n, d, 0.35, felt, echo=0.35)
    # static swells
    for st in (10, 26, 42, 58):
        render_noise(s.buf, st * s.beat, 2.2, 0.08, decay=1.5, lp=0.15)
    write_wav(OUT / "bgm_depths.wav", s.buf, 0.8)


def bgm_battle():
    s = Song(32.0, 120)
    prog = ["Am", "F", "C", "G", "Am", "F", "Dm", "E"] * 2
    for bar, sym in enumerate(prog):
        b = bar * 4
        root = chord_notes(sym, 2)[0]
        for k in range(4):
            s.note(b + k, root, 0.5, 0.5 if k % 2 == 0 else 0.35, subbass)
        render_kick(s.buf, b * s.beat, 0.6)
        render_kick(s.buf, (b + 2.5) * s.beat, 0.4)
        render_noise(s.buf, (b + 1) * s.beat, 0.09, 0.3, decay=25, lp=0.6)
        render_noise(s.buf, (b + 3) * s.beat, 0.09, 0.3, decay=25, lp=0.6)
        s.arp(b, sym, 4, [0, 2, 1, 2], 0.5, 0.22, pluck)
    mel = [(0, "A4", 0.5), (0.5, "C5", 0.5), (1, "E5", 1), (2, "D5", 0.5),
           (2.5, "C5", 0.5), (3, "D5", 1), (4, "C5", 0.5), (4.5, "A4", 0.5),
           (5, "C5", 1.5), (6.5, "G4", 0.5), (7, "A4", 1),
           (8, "E5", 0.5), (8.5, "G5", 0.5), (9, "G5", 1), (10, "F5", 0.5),
           (10.5, "E5", 0.5), (11, "D5", 1), (12, "E5", 0.5), (12.5, "C5", 0.5),
           (13, "B4", 1), (14, "G#4", 1), (15, "B4", 1),
           (16, "A4", 0.5), (16.5, "E5", 0.5), (17, "E5", 1), (18, "F5", 0.5),
           (18.5, "E5", 0.5), (19, "D5", 1), (20, "C5", 1), (21, "D5", 1),
           (22, "E5", 1), (23, "C5", 0.5), (23.5, "A4", 0.5),
           (24, "F5", 1), (25, "E5", 1), (26, "D5", 1), (27, "F5", 1),
           (28, "E5", 1.5), (29.5, "D5", 0.5), (30, "C5", 1), (31, "B4", 1)]
    for b, n, d in mel:
        s.note(b, n, d, 0.4, softsquare, echo=0.12)
    write_wav(OUT / "bgm_battle.wav", s.buf, 0.8)


def bgm_boss():
    s = Song(38.4, 150)
    prog = ["Cm", "Cm", "Ab", "G", "Cm", "Cm", "Fm", "G"] * 2
    for bar, sym in enumerate(prog):
        b = bar * 6  # 6/8 feel: 6 eighth-beats per bar at doubled pulse
        root = chord_notes(sym, 2)[0]
        for k in (0, 3, 5):
            s.note(b + k, root, 0.5, 0.55, subbass)
        render_kick(s.buf, b * s.beat, 0.7)
        render_kick(s.buf, (b + 3) * s.beat, 0.5)
        render_noise(s.buf, (b + 4.5) * s.beat, 0.1, 0.35, decay=22, lp=0.5)
        s.arp(b, sym, 3, [0, 2, 1], 1.0, 0.3, felt)
    mel = [(0, "G4", 2), (2, "Ab4", 1), (3, "G4", 2), (5, "F4", 1),
           (6, "Eb4", 3), (9, "G4", 3),
           (12, "Ab4", 2), (14, "Bb4", 1), (15, "B4", 3),
           (18, "D5", 2), (20, "C5", 1), (21, "G4", 3),
           (24, "C5", 2), (26, "Bb4", 1), (27, "Ab4", 2), (29, "G4", 1),
           (30, "F4", 3), (33, "Ab4", 2), (35, "G4", 1),
           (36, "G4", 3), (42, "C4", 6)]
    for b, n, d in mel:
        s.note(b, n, d, 0.42, softsquare, echo=0.15)
    render(s.buf, 0, freq("C2"), 38.4, 0.4, drone)
    write_wav(OUT / "bgm_boss.wav", s.buf, 0.8)


def bgm_ending():
    s = Song(76.8, 75)
    prog = ["C", "G", "Am", "F", "C", "G", "F", "C",
            "Am", "Em", "F", "C", "Dm7", "G7", "Cmaj7", "Cmaj7"]
    for bar, sym in enumerate(prog):
        b = bar * 6
        notes = chord_notes(sym, 3)
        s.note(b, notes[0], 2, 0.5, felt, echo=0.2)
        s.arp(b, sym, 3, [0, 1, 2, 1, 2, 1], 1.0, 0.3, felt, dur=2.5, echo=0.2)
    # full friendship theme, twice: felt then musicbox an octave up
    for b, n, d in THEME_C:
        s.note(24 + b * 1.5, n[:-1] + str(int(n[-1]) + 1), d * 1.5, 0.5, felt, echo=0.3)
    for b, n, d in THEME_C:
        s.note(60 + b * 1.0, n[:-1] + str(int(n[-1]) + 2), d, 0.4, musicbox, echo=0.35)
    render(s.buf, 0, freq("C3"), 38.4, 0.5, pad)
    render(s.buf, 38.4, freq("F2"), 38.4, 0.5, pad)
    write_wav(OUT / "bgm_ending.wav", s.buf, 0.78)


# ---------------------------------------------------------------- SFX

def sfx_buf(seconds):
    return new_buf(seconds)


def sfx_blip():
    b = sfx_buf(0.06)
    render(b, 0, 620, 0.05, 0.6, softsquare, wrap=False)
    write_wav(OUT / "sfx_blip.wav", b, 0.5)


def sfx_confirm():
    b = sfx_buf(0.25)
    render(b, 0.0, freq("C5"), 0.09, 0.5, pluck, wrap=False)
    render(b, 0.07, freq("G5"), 0.15, 0.5, pluck, wrap=False)
    write_wav(OUT / "sfx_confirm.wav", b, 0.6)


def sfx_cancel():
    b = sfx_buf(0.22)
    render(b, 0.0, freq("G4"), 0.09, 0.5, pluck, wrap=False)
    render(b, 0.07, freq("C4"), 0.14, 0.5, pluck, wrap=False)
    write_wav(OUT / "sfx_cancel.wav", b, 0.55)


def sfx_step():
    b = sfx_buf(0.09)
    render_noise(b, 0, 0.07, 0.5, decay=45, lp=0.25, wrap=False)
    write_wav(OUT / "sfx_step.wav", b, 0.3)


def sfx_hit():
    b = sfx_buf(0.3)
    render_noise(b, 0, 0.18, 0.7, decay=18, lp=0.5, wrap=False)
    for i in range(int(0.16 * SR)):
        t = i / SR
        f = 300 * math.exp(-10 * t) + 60
        b[i] += 0.6 * math.sin(TWO_PI * f * t) * math.exp(-12 * t)
    write_wav(OUT / "sfx_hit.wav", b, 0.65)


def sfx_heal():
    b = sfx_buf(0.7)
    for k, n in enumerate(["C5", "E5", "G5", "C6"]):
        render(b, k * 0.09, freq(n), 0.4, 0.4, musicbox, wrap=False)
    write_wav(OUT / "sfx_heal.wav", b, 0.6)


def sfx_emotion():
    b = sfx_buf(0.5)
    for k in range(10):
        render(b, k * 0.03, 500 + k * 160, 0.1, 0.3, kalimba, wrap=False)
    write_wav(OUT / "sfx_emotion.wav", b, 0.55)


def sfx_save():
    b = sfx_buf(1.2)
    for k, n in enumerate(["G4", "C5", "E5", "G5", "E5", "C6"]):
        render(b, k * 0.12, freq(n), 0.6, 0.4, musicbox, wrap=False)
    write_wav(OUT / "sfx_save.wav", b, 0.6)


def sfx_door():
    b = sfx_buf(0.5)
    render_noise(b, 0, 0.3, 0.4, decay=8, lp=0.12, wrap=False)
    render(b, 0.25, freq("C4"), 0.2, 0.4, pluck, wrap=False)
    write_wav(OUT / "sfx_door.wav", b, 0.55)


def sfx_page():
    b = sfx_buf(0.45)
    render_noise(b, 0, 0.35, 0.5, decay=7, lp=0.45, wrap=False)
    write_wav(OUT / "sfx_page.wav", b, 0.5)


def sfx_heartbeat():
    b = sfx_buf(0.8)
    render_kick(b, 0, 0.8, wrap=False)
    render_kick(b, 0.33, 0.55, wrap=False)
    write_wav(OUT / "sfx_heartbeat.wav", b, 0.7)


def sfx_static():
    b = sfx_buf(0.9)
    render_noise(b, 0, 0.85, 0.4, decay=3.5, lp=0.2, wrap=False)
    write_wav(OUT / "sfx_static.wav", b, 0.5)


def sfx_tear():
    b = sfx_buf(0.5)
    n0 = 0
    for i in range(int(0.4 * SR)):
        t = i / SR
        white = _rand.uniform(-1, 1)
        rip = 1.0 if _rand.random() < 0.4 + t else 0.2
        b[i] += white * rip * 0.5 * math.exp(-5 * t)
    write_wav(OUT / "sfx_tear.wav", b, 0.5)


def sfx_soothe():
    b = sfx_buf(1.4)
    for k, n in enumerate(["F4", "A4", "C5", "E5"]):
        render(b, k * 0.05, freq(n), 1.1, 0.35, felt, wrap=False)
    write_wav(OUT / "sfx_soothe.wav", b, 0.6)


def sfx_victory():
    b = sfx_buf(1.6)
    seq = [(0, "C5", 0.15), (0.15, "C5", 0.15), (0.3, "C5", 0.15),
           (0.45, "E5", 0.3), (0.8, "D5", 0.15), (0.95, "E5", 0.6)]
    for st, n, d in seq:
        render(b, st, freq(n), d + 0.2, 0.5, pluck, wrap=False)
        render(b, st, freq(n) / 2, d + 0.2, 0.3, subbass, wrap=False)
    write_wav(OUT / "sfx_victory.wav", b, 0.7)


def sfx_defeat():
    b = sfx_buf(1.6)
    for k, n in enumerate(["E4", "Eb4", "D4", "C#4"]):
        render(b, k * 0.3, freq(n), 0.5, 0.4, felt, wrap=False)
    write_wav(OUT / "sfx_defeat.wav", b, 0.6)


ALL = [bgm_title, bgm_blank, bgm_real, bgm_meadow, bgm_woods, bgm_bay,
       bgm_depths, bgm_battle, bgm_boss, bgm_ending,
       sfx_blip, sfx_confirm, sfx_cancel, sfx_step, sfx_hit, sfx_heal,
       sfx_emotion, sfx_save, sfx_door, sfx_page, sfx_heartbeat, sfx_static,
       sfx_tear, sfx_soothe, sfx_victory, sfx_defeat]

if __name__ == "__main__":
    import sys
    names = sys.argv[1:]
    for fn in ALL:
        if names and fn.__name__ not in names:
            continue
        fn()
    print("done")
