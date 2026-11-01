#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FFMPEG="${FFMPEG:-$(command -v ffmpeg)}"
FFPROBE="${FFPROBE:-$(command -v ffprobe)}"
if [[ -z "$FFMPEG" || -z "$FFPROBE" ]]; then
  echo "ffmpeg and ffprobe are required" >&2
  exit 1
fi

mkdir -p trailer/renders/work trailer/captures

echo "[1/6] Generate temporary Turkish narration"
say -v Yelda -r 145 -o trailer/audio/voiceover.aiff "$(tr '\n' ' ' < trailer/scripts/voiceover_plain.txt)"

echo "[2/6] Generate original procedural ambient bed"
"$FFMPEG" -y \
  -f lavfi -i "sine=frequency=196:sample_rate=48000:duration=120" \
  -f lavfi -i "sine=frequency=246.94:sample_rate=48000:duration=120" \
  -f lavfi -i "anoisesrc=color=brown:amplitude=0.025:sample_rate=48000:duration=120" \
  -filter_complex "[0:a]lowpass=900,volume=0.07[a0];[1:a]lowpass=900,volume=0.05[a1];[2:a]highpass=2500,volume=0.035[a2];[a0][a1][a2]amix=inputs=3:duration=longest,alimiter=limit=0.9,afade=t=in:st=0:d=2,afade=t=out:st=117:d=3" \
  -ar 48000 -ac 2 trailer/audio/original_ambient_bed.wav

echo "[3/6] Normalize real 90-second gameplay"
"$FFMPEG" -y -i trailer/raw/real-gameplay-90s.webm \
  -vf "tpad=stop_mode=clone:stop_duration=1,scale=1920:1080:flags=lanczos,format=yuv420p" \
  -t 90 -r 30 -an -c:v libx264 -preset medium -crf 18 -movflags +faststart \
  trailer/renders/work/gameplay-90s.mp4

echo "[4/6] Build 30-second real-gameplay screenshot teaser"
for i in 1 2 3 4 5 6; do
  case "$i" in
    1) src=real-main-menu.png ;;
    2) src=real-character-selection.png ;;
    3) src=real-rpg-spawn.png ;;
    4) src=real-rpg-quest.png ;;
    5) src=real-flood-simulation.png ;;
    6) src=real-planning-journal.png ;;
  esac
  "$FFMPEG" -y -loop 1 -t 5 -i "trailer/graphics/$src" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1" \
    -an -r 30 -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p "trailer/renders/work/teaser-$i.mp4"
done

"$FFMPEG" -y \
  -i trailer/renders/work/teaser-1.mp4 -i trailer/renders/work/teaser-2.mp4 \
  -i trailer/renders/work/teaser-3.mp4 -i trailer/renders/work/teaser-4.mp4 \
  -i trailer/renders/work/teaser-5.mp4 -i trailer/renders/work/teaser-6.mp4 \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v]concat=n=6:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 30 -an -c:v libx264 -preset medium -crf 18 -movflags +faststart \
  trailer/renders/work/teaser-30s.mp4

echo "[5/6] Concatenate picture and mix narration with original bed"
"$FFMPEG" -y -i trailer/renders/work/teaser-30s.mp4 -i trailer/renders/work/gameplay-90s.mp4 \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -r 30 -an -c:v libx264 -preset medium -crf 18 -movflags +faststart \
  trailer/renders/work/picture-120s.mp4

"$FFMPEG" -y -i trailer/audio/voiceover.aiff -i trailer/audio/original_ambient_bed.wav \
  -filter_complex "[0:a]volume=1.2[vo];[1:a]volume=0.18[bed];[vo][bed]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.92,apad,atrim=duration=120,afade=t=in:st=0:d=0.4,afade=t=out:st=118:d=2[a]" \
  -map "[a]" -ar 48000 -ac 2 -c:a pcm_s16le trailer/renders/work/audio-120s.wav

echo "[6/6] Encode exact 120-second H.264/AAC delivery"
"$FFMPEG" -y -i trailer/renders/work/picture-120s.mp4 -i trailer/renders/work/audio-120s.wav \
  -map 0:v -map 1:a -t 120 -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  trailer/renders/SEHRIN_YARINI_OFFICIAL_TRAILER_2MIN.mp4

echo "Extracting preview frames"
for t in 5 20 35 50 70 90 110 118; do
  "$FFMPEG" -y -ss "$t" -i trailer/renders/SEHRIN_YARINI_OFFICIAL_TRAILER_2MIN.mp4 -frames:v 1 -q:v 2 "trailer/captures/preview_${t}s.png"
done

"$FFPROBE" -v error -show_entries format=duration:stream=codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,pix_fmt -of json trailer/renders/SEHRIN_YARINI_OFFICIAL_TRAILER_2MIN.mp4
