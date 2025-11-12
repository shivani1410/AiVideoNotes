// import { Component, signal } from '@angular/core';
// // import { RouterOutlet } from '@angular/router';
// // import {Auth,signInWithPopup,GoogleAuthProvider} from '@angular/fire/auth'
// import { AppService } from './app-service';
// import { CommonModule } from '@angular/common';     // 👈 for *ngIf
// import { FormsModule } from '@angular/forms';       // 👈 for [(ngModel)]
// import { HttpClientModule } from '@angular/common/http';
// import { HttpClient } from '@angular/common/http';
// @Component({
//   selector: 'app-root',
//   imports:[ CommonModule,
//     FormsModule,
//     HttpClientModule],
//   templateUrl: './app.html',
//   styleUrl: './app.css'
// })
// export class App {
//   // protected readonly title = signal('ai-video-notes');
//   // constructor(private auth:Auth){}
//   // async login(){
//   //   const provider=new GoogleAuthProvider();
//   //   provider.addScope('https://www.googleapis.com/auth/youtube.force-ssl');
//   //   const result=await signInWithPopup(this.auth,provider);
//   //   const user=result.user;
//   //   const idToken=await user.getIdToken();
//   //   const accessToken=(result as any)._tokenResponse.oauthAccessToken;
//   //    console.log('ID Token:', idToken);
//   //   console.log('Access Token:', accessToken);

//   //   const videoUrl='https://www.youtube.com/watch?v=X8YYWunttOY';
//   //   const formData=new FormData();
//   //   formData.append('url',videoUrl);
//   //   formData.append('access_token',accessToken);
//   //   const res=await fetch('http://127.0.0.1:8000/process_video',{
//   //     method:'POST',
//   //     body:formData
//   //   });
//   //   console.log(await res.json());
//   // }
// videoUrl = '';
//   loading = false;
//   error = '';
//   notes: string | null = null;

//   constructor(private http: HttpClient) {}

//   processVideo() {
//     this.loading = true;
//     this.error = '';

//     const formData = new FormData();
//     formData.append('url', this.videoUrl);

//     this.http.post('http://127.0.0.1:8000/process_video', formData)
//       .subscribe({
//         next: (res: any) => {
//           this.loading = false;
//           this.notes = res['summary']; // adjust this based on your backend response
//           console.log(res);
//         },
//         error: (err) => {
//           this.loading = false;
//           this.error = 'Failed to process video';
//           console.error(err);
//         }
//       });
//   }
// }
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule,HttpEventType } from '@angular/common/http';
import { ChatNotes } from './chat-notes/chat-notes';
import { EncryptionService } from './encrypt.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,ChatNotes],
  templateUrl: './app.html'
})
export class App {
  videoUrl = '';
  loading = false;
  result: string | null = null;
  error: string | null = null;
  formattedResult: string | null = null;
  selectedFile: File | null = null;
  progress=0;
  constructor(private http: HttpClient,
   private  encryptionService: EncryptionService
  ) { }

  onSubmit() {
    var enc=this.encryptionService.encryptString("Hello World!","rUldebUHF/o=");
    console.log(enc);
    var decrypt=this.encryptionService.decryptString(enc,"rUldebUHF/o=");
    console.log(decrypt);
    if (!this.videoUrl.trim()) {
      this.error = 'Please enter a video URL.';
      return;
    }

    this.loading = true;
    this.result = null;
    this.error = null;
    const formData = new FormData();
    formData.append('url', this.videoUrl);
    this.http
      .post<{ message: string }>('http://127.0.0.1:8000/process_video', formData)
      .subscribe({
        next: (res: any) => {
          this.result = res['summary'];
          this.loading = false;
          this.formattedResult = this.formatText(res['summary']);
        },
        error: (err) => {
          this.error = 'Something went wrong.';
          this.loading = false;
        },
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
  onFileSelected(event:any){
    this.selectedFile=event.target.files[0];
    this.result='';
    this.progress=0
  }
   onUpload() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('video_file', this.selectedFile);

    this.loading = true;

    this.http.post<{summary: string}>('http://127.0.0.1:8000/process_video_file', formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          console.log(event.body);
          this.result = event.body?.summary || 'No summary received.';
          this.loading = false;
          this.formattedResult = this.formatText(this.result);
        }
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
