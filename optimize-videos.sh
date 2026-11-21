#!/usr/bin/env bash
# optimize-videos.sh
# Re-encodes the case-study videos so they start playing sooner, and makes a poster frame for each.
# Originals are never touched: everything is written to ./optimized
#
#   ./optimize-videos.sh public/origen-hero.webm public/origen-color.mp4 ...
#   ./optimize-videos.sh public/*.webm public/*.mp4
#
# Needs ffmpeg >= 4.4 with libx264 and libvpx-vp9 (brew install ffmpeg).
# Tunables (env vars): MAX_W=1600  CRF_MP4=27  CRF_WEBM=34  POSTER_AT=0.3  OUT=optimized
set -euo pipefail

MAX_W="${MAX_W:-1600}"
CRF_MP4="${CRF_MP4:-27}"
CRF_WEBM="${CRF_WEBM:-34}"
POSTER_AT="${POSTER_AT:-0.3}"
OUT="${OUT:-optimized}"

[ "$#" -gt 0 ] || { echo "usage: $0 video [video ...]"; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
mkdir -p "$OUT"

size() { du -h "$1" | cut -f1; }

for in in "$@"; do
  [ -f "$in" ] || { echo "skip (not a file): $in"; continue; }
  base="$(basename "$in")"
  name="${base%.*}"
  # never upscale, keep even dimensions
  vf="scale='min(${MAX_W},iw)':-2"

  # VP9 WebM can carry transparency; ffmpeg only keeps it if the libvpx decoder is used.
  alpha="$(ffprobe -v error -select_streams v:0 -show_entries stream_tags=alpha_mode -of csv=p=0 "$in" 2>/dev/null || true)"

  echo "== $base"

  if [ "$alpha" = "1" ]; then
    echo "   has transparency: writing WebM only (H.264 MP4 cannot hold alpha)"
    ffmpeg -v error -y -c:v libvpx-vp9 -i "$in" -an -vf "$vf" \
      -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf "$CRF_WEBM" \
      -row-mt 1 -deadline good -cpu-used 2 -cues_to_front 1 "$OUT/$name.webm"
    ffmpeg -v error -y -c:v libvpx-vp9 -ss "$POSTER_AT" -i "$in" -frames:v 1 -vf "$vf" \
      -c:v libwebp -lossless 0 -q:v 80 "$OUT/$name-poster.webp" || true
  else
    # H.264 MP4: hardware-decoded on every Apple device. +faststart puts the index at the
    # front of the file so playback can begin before the download finishes.
    ffmpeg -v error -y -i "$in" -an -vf "$vf" \
      -c:v libx264 -preset slow -crf "$CRF_MP4" -profile:v high -pix_fmt yuv420p \
      -movflags +faststart "$OUT/$name.mp4"

    # VP9 WebM: smaller for Chrome/Firefox. cues_to_front moves the seek index to the start
    # (ffmpeg writes it at the end by default, which costs an extra round trip before playback).
    ffmpeg -v error -y -i "$in" -an -vf "$vf" \
      -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf "$CRF_WEBM" \
      -row-mt 1 -deadline good -cpu-used 2 -cues_to_front 1 "$OUT/$name.webm"

    # Poster frame shown instantly while the video buffers
    ffmpeg -v error -y -ss "$POSTER_AT" -i "$in" -frames:v 1 -vf "$vf" -q:v 3 "$OUT/$name-poster.jpg"
  fi

  printf '   original %s  ->  ' "$(size "$in")"
  for f in "$OUT/$name".mp4 "$OUT/$name".webm; do
    [ -f "$f" ] && printf '%s %s   ' "${f##*.}" "$(size "$f")"
  done
  echo
done

echo
echo "Done. Review the files in ./$OUT, then copy them over the ones in public/."
