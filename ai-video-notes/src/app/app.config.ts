import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp,initializeApp } from '@angular/fire/app';
import { routes } from './app.routes';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideHttpClient } from '@angular/common/http';
export const appConfig: ApplicationConfig = {
  providers: [
     provideHttpClient(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
     provideFirebaseApp(()=>initializeApp({
          apiKey: "AIzaSyBaRAGh8rNdJ_Uyhwg8yVLIP403Mjs9Vvo",
  authDomain: "aivideonotes.firebaseapp.com",
  projectId: "aivideonotes",
  storageBucket: "aivideonotes.firebasestorage.app",
  messagingSenderId: "775606633360",
  appId: "1:775606633360:web:bdfeabfe24e57662aca915",
  measurementId: "G-F8WP38L2BF"
      })),
       provideAuth(() => getAuth())
  ]
};
