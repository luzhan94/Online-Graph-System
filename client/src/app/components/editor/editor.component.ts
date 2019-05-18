
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { CollaborationService } from '../../services/collaboration.service'
import { DataService } from '../../services/data.service';
import { DomSanitizer } from '@angular/platform-browser';

declare var ace: any;

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  public languages: string[] = ['Java', 'Python'];
  editor: any;
  problemId: string;
  language: string = 'Python';
  
  graph: string = '';
  
  defaultContent = {
    'Python': `class Solution:
      def example():
        # write your Python code here`,
    'Java': ''
  };

  constructor(private route: ActivatedRoute,
    private collaborationService: CollaborationService,
    private dataService: DataService,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this.route.params
      .subscribe(params => {
        this.problemId = params['id'];
        this.initEditor();
      });
    console.log("problemID: " + this.problemId);
    //send restoreBuffer to server
    this.collaborationService.restoreBuffer();
  }
  
  initEditor(): void {
    this.editor = ace.edit("editor");
    this.editor.setTheme("ace/theme/eclipse");
    this.resetEditor();
    
    document.getElementsByTagName('textarea')[0].focus();
    
    this.editor.setOption("maxLines", 20);
    this.editor.setOption("minLines", 20);
    
    this.editor.lastAppliedChange = null;
    
    this.collaborationService.init(this.editor, this.problemId);
    
    this.editor.on('change', (e) => {
      console.log('editor changes: ' + JSON.stringify(e));
      
      if (this.editor.lastAppliedChange != e) {
        this.collaborationService.change(JSON.stringify(e));
      }
    })
  }
  
  resetEditor(): void {
    this.editor.setValue(this.defaultContent[this.language]);
  }
  
  setLanguage(language: string): void {
    this.language = language;
    this.resetEditor();
  }
  
  submit(): void {
    let code = this.editor.getValue();
    console.log(code);
    
    const data = {
      code: code,
      lang: this.language.toLowerCase()
    };

    this.dataService.buildAndRun(data).then(res => this.graph = 'data:image/png;base64, ' + res);
  }

}
