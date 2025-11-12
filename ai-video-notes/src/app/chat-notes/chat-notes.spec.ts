import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatNotes } from './chat-notes';

describe('ChatNotes', () => {
  let component: ChatNotes;
  let fixture: ComponentFixture<ChatNotes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatNotes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatNotes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
