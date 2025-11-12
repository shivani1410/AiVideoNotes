import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class AppService {
  backendUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) {}

  processVideo(videoUrl: string): Observable<any> {
    return this.http.post(`${this.backendUrl}/process_video`, { url: videoUrl });
  }
  
}
