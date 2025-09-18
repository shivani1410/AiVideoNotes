from fastapi import FastAPI,Form,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
import random
import logging
import tempfile, os, subprocess
from pathlib import Path
from groq import Groq
from fastapi.responses import JSONResponse
import yt_dlp
from fastapi.responses import FileResponse
from supabase import create_client,Client
from urllib.parse import urlparse, parse_qs
import math
from yt_dlp.utils import DownloadError
from yt_dlp import YoutubeDL
import hashlib

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
# Get a logger instance
logger = logging.getLogger(__name__)
app=FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'],allow_methods=["*"],allow_headers=['*'])

groq_client = Groq(api_key=GROQ_API_KEY)
supabase:Client=create_client(SUPABASE_URL,SUPABASE_KEY)


def get_video_id(url: str) -> str:
    query=parse_qs(urlparse(url).query)
    return query.get("v",[""])[0]

def check_restrictions(url):
    ydl_opts={
        "quiet":True,
        "nocheck_certificate":True
    }
    with YoutubeDL(ydl_opts) as ydl:
        try:
            info=ydl.extract_info(url,download=False)
            print("✅ Video is accessible")
            print(f"Title: {info.get('title')}")
            print(f"Age restricted: {info.get('age_limit') is not None}")
            print(f"Region restrictions: {info.get('geo_restricted') or 'None'}")
            return True,info
        except DownloadError as e:
            err=str(e)
            if "sign in" in err.lower() or "age" in err.lower():
                print("🔒 Possibly age-restricted / login required")
            elif "geo" in err.lower() or "region" in err.lower():
                print("🌍 Possibly region-locked")
            else:
                print(f"Error: {err}")
            return False,err
def download_video(url,output_dir):
    ydl_opts={
        'format':'best',
        'outtmpl':str(Path(output_dir)/'video.%(ext)s'),
        'cookiefile': 'cookies.txt'
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    for f in os.listdir(output_dir):
            if f.startswith("video."):
                return os.path.join(output_dir,f)
    return None

def extract_audio(video_path,output_dir):
    audio_path=os.path.join(output_dir,'audio.wav')
    cmd=[
        "ffmpeg","-i",video_path,
        "-q:a","0","-map","a",audio_path,"-y"
    ]
    subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
        raise RuntimeError(f"ffmpeg failed to extract audio from {video_path}")
    return audio_path

def spilt_audio(audio_path,output_dir,chunk_length=600):
    rresult = subprocess.run(
        ["ffprobe", "-i", audio_path, "-show_entries", "format=duration",
         "-v", "quiet", "-of", "csv=p=0"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    output = rresult.stdout.strip()
    if not output or output.upper() == "N/A":
        raise ValueError(f"ffprobe could not read duration of file: {audio_path}")
    
    duration=float(rresult.stdout.strip())
    num_chunks=math.ceil(duration/chunk_length)
    chunk_paths=[]
    for i in range(num_chunks):
        start=i*chunk_length
        out_path=os.path.join(output_dir,f"chunk_{i}.wav")
        cmd = [
            "ffmpeg", "-i", audio_path,
            "-ss", str(start),
            "-t", str(chunk_length),
            "-c", "copy", out_path, "-y"
        ]
        subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        chunk_paths.append(out_path)
    return chunk_paths
    
def transcribe_chunks(chunk_paths):
    texts=[]
    for cp in chunk_paths:
        with open(cp,'rb') as f:
            transcript=groq_client.audio.transcriptions.create(
                file=f,
                model="whisper-large-v3-turbo"
            )
            texts.append(transcript.text)
    return " ".join(texts)



def summarize_text(text):
    prompt=f"Notes:{text}"
    response=groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role":"system","content":"You are an assistant that summarizes transcripts and make clear bullet points notes."},
            {"role":"user","content":prompt}
        ],
        max_tokens=150
    )
    return response.choices[0].message.content  

def get_file_hash(file_path:str)->str:
    hasher=hashlib.md5()
    with open(file_path,"rb") as f:
        for chunk in iter(lambda:f.read(8192),b""):
            hasher.update(chunk)
    return hasher.hexdigest()
      
@app.post("/process_video")
async def process_video(url: str = Form(...)):
    try:
        check,info=check_restrictions(url)
        video_id=get_video_id(url)
        existing=supabase.table("video_transcripts").select("*").eq("video_id",video_id).execute()
        if existing.data:
            summary=summarize_text(existing.data[0]["transcript"])
            return {"summary": summary}
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path=download_video(url,tmpdir)
            if not video_path:
                return JSONResponse({"error": "Video download failed"}, status_code=500)
            
            audio_path=extract_audio(video_path=video_path,output_dir=tmpdir)
            chunk_paths=spilt_audio(audio_path,tmpdir,100)
            
        
            # text=transcribe_audio(audio_path)
            text=transcribe_chunks(chunk_paths)
            supabase.table("video_transcripts").insert({
                "video_id": video_id,
                "transcript": text
            }).execute()
            summary=summarize_text(text)
            return {"summary": summary}
    except Exception as e:
        JSONResponse({"error": str(e)}, status_code=500)

@app.post("/process_video_file")
async def process_video_file(video_file:UploadFile=File(...)):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            video_path=os.path.join(tmpdir,video_file.filename)
            with open(video_path,"wb") as f:
                f.write(await video_file.read())

            video_id=get_file_hash(video_path)
            existing=supabase.table("video_transcripts").select("*").eq("video_id",video_id).execute()
            if existing.data:
                summary=summarize_text(existing.data[0]["transcript"])
                return {"summary":summary}

            audio_path=extract_audio(video_path,tmpdir)
            chunk_paths=spilt_audio(audio_path,tmpdir,100)
            text=transcribe_chunks(chunk_paths)
            
            supabase.table("video_transcripts").insert({
                "video_id":video_id,
                "transcript":text
            }).execute()
            summary=summarize_text(text)
            return {"summary":summary}
    except Exception as e:
        JSONResponse({"error":str(e)},status_code=500)
                

