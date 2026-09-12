import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <main class="auth-page">
      <div class="auth-card">
        <p class="eyebrow">WORKLY</p>
        <h1>Sign in</h1>
        <p class="subtitle">This is a placeholder for the login route.</p>
        <a class="primary-link" routerLink="/">Back to home</a>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .auth-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #f4f8ff 0%, #eef5ff 100%);
      padding: 40px 20px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }
    .auth-card {
      width: min(480px, 100%);
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
      text-align: center;
    }
    .eyebrow {
      margin: 0 0 12px;
      color: #2d76ff;
      letter-spacing: 0.18em;
      font-size: 0.7rem;
      font-weight: 800;
    }
    h1 {
      margin: 0;
      color: #101827;
      font-size: clamp(2rem, 5vw, 3rem);
      letter-spacing: -0.06em;
    }
    .subtitle {
      margin: 12px 0 20px;
      color: #5d6b7d;
      line-height: 1.6;
    }
    .primary-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      background: linear-gradient(135deg, #2d76ff, #0b5de4);
      color: #fff;
      border-radius: 12px;
      padding: 0.9rem 1.3rem;
      font-weight: 700;
    }
  `],
})
export class Login {}
