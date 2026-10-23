#!/bin/sh
# Installs the local audio tools (Demucs, Basic Pitch) used by audio_to_midi.
# Set LOGIC_AI_AUDIO_HOME to install somewhere else (e.g. an external disk).
set -e
HOME_DIR="${LOGIC_AI_AUDIO_HOME:-$HOME/.logic-ai-composer}"
mkdir -p "$HOME_DIR"
python3.11 -m venv "$HOME_DIR/venv" 2>/dev/null || python3 -m venv "$HOME_DIR/venv"
"$HOME_DIR/venv/bin/pip" install -q demucs basic-pitch librosa soundfile pedalboard pyloudnorm "setuptools<81"
echo "Audio tools installed in $HOME_DIR"
