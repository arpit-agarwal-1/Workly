import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MobileMenuService {
  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}