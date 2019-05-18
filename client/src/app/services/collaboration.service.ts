import { Injectable } from '@angular/core';

declare var io: any;

@Injectable({
  providedIn: 'root'
})
export class CollaborationService {
  collaborationSocket: any;

  constructor() { }
  
  init(editor: any, problemId: string): void {
    this.collaborationSocket = io(window.location.origin, { query: 'problemId=' + problemId});
    
    this.collaborationSocket.on('message', (message) => {
      console.log('message received from server: ' + message);
    })
    
    this.collaborationSocket.on('change', (delta: string) => {
      console.log('collaboration: editor changes by ' + delta);
      delta = JSON.parse(delta);
      editor.lastAppliedChange = delta;
      editor.getSession().getDocument().applyDeltas([delta]);
    });
  }
  
  change(delta: string): void {
    this.collaborationSocket.emit('change', delta);
  }
  
  restoreBuffer(): void {
    this.collaborationSocket.emit('restoreBuffer');
  }
}
