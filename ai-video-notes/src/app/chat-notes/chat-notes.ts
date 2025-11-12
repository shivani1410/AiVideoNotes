import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule,HttpEventType } from '@angular/common/http';
interface Message {
  videoUrl?: string;
  fileName?: string;
  notes: string;
}
@Component({
  selector: 'app-chat-notes',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat-notes.html',
  styleUrl: './chat-notes.css'
})
export class ChatNotes {
 videoUrl = '';
  selectedFile: File | null = null;
  messages: Message[] = [];
  loading = false;
  question='';
text='';
  constructor(private http: HttpClient) {}

  onSubmit() {
    if (this.text.startsWith('http')) {
      this.onProcessURL();
    } else {
      this.onChatAssistant();
    }
  }
onProcessURL(){
if (!this.text.trim()) return;

    this.loading = true;
    const formData = new FormData();
    formData.append('url', this.text);

    this.http.post<any>('http://127.0.0.1:8000/process_video', formData)
      .subscribe({
        next: res => {
          this.messages.push({
            videoUrl: this.text,
            notes: this.formatText(res.summary)
          });
          this.text = '';
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
}
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onUpload() {
    if (!this.selectedFile) return;

    this.loading = true;
    const formData = new FormData();
    formData.append('video_file', this.selectedFile);

    this.http.post<any>('http://127.0.0.1:8000/process_video_file', formData)
      .subscribe({
        next: res => {
          this.messages.push({
            fileName: this.selectedFile!.name,
            notes: this.formatText(res.summary)
          });
          this.selectedFile = null;
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }
  onChatAssistant(){
    this.loading = true;
     const formData = new FormData();
    formData.append('question', this.text);

    this.http.post<any>('http://127.0.0.1:8000/chat_assistant', formData)
      .subscribe({
        next: res => {
          this.messages.push({
            videoUrl: this.text,
            notes: this.formatText(res.summary)
          });
          this.text = '';
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }
    formatText(text: string): string {
    // convert **Heading** to <h5>Heading</h5>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<h5 class="mt-3">$1</h5>');

    // convert * bullet to <li> inside <ul>
    html = html.replace(/(?:^|\n)\* (.*?)(?=\n|$)/g, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul class="mt-2">$1</ul>');

    // turn newlines into paragraph breaks
    html = html.replace(/\n\s*\n/g, '</p><p>');

    return `<div>${html}</div>`;
  }
}
