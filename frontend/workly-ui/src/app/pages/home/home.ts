import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBarChart3,
  LucideBriefcase,
  LucideCalendarDays,
  LucideCheck,
  LucideCirclePlay,
  LucideFolderKanban,
  LucideGlobe,
  LucideMenu,
  LucideMessageSquareText,
  LucideQuote,
  LucideSparkles,
  LucideUsers,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideArrowRight, LucideBarChart3, LucideBriefcase, LucideCalendarDays, LucideCheck, LucideCirclePlay, LucideFolderKanban, LucideGlobe, LucideMenu, LucideMessageSquareText, LucideQuote, LucideSparkles, LucideUsers, LucideX],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly mobileMenuOpen = signal(false);

  protected readonly navItems = ['Features', 'Solutions', 'Pricing', 'Resources', 'Company'];

  protected readonly trustItems = [
    'Free to get started',
    'No credit card required',
    'Loved by teams worldwide',
  ];

  protected readonly brands = ['Microsoft', 'Google', 'Slack', 'Notion', 'Spotify', 'Zoom', 'Airbnb', 'Figma'];

  protected readonly featureCards = [
    {
      title: 'Project Management',
      description: 'Plan, track and deliver projects with ease.',
      icon: 'project',
      tone: 'blue',
    },
    {
      title: 'Task Management',
      description: 'Turn ideas into action with powerful task tools.',
      icon: 'task',
      tone: 'mint',
    },
    {
      title: 'Team Collaboration',
      description: 'Work together, no matter where you are.',
      icon: 'team',
      tone: 'purple',
    },
    {
      title: 'Calendar & Scheduling',
      description: 'Keep everyone aligned.',
      icon: 'calendar',
      tone: 'peach',
    },
    {
      title: 'Reports & Analytics',
      description: 'Get insights and make better decisions.',
      icon: 'analytics',
      tone: 'rose',
    },
  ];

  protected readonly steps = [
    {
      title: 'Plan',
      description: 'Set goals and plan your projects',
      icon: 'plan',
      tone: 'blue',
    },
    {
      title: 'Organize',
      description: 'Break down work and assign tasks',
      icon: 'organize',
      tone: 'green',
    },
    {
      title: 'Collaborate',
      description: 'Work together in real-time',
      icon: 'collaborate',
      tone: 'purple',
    },
    {
      title: 'Deliver',
      description: 'Track progress and achieve results',
      icon: 'deliver',
      tone: 'orange',
    },
  ];

  protected readonly checklist = [
    'All-in-one workspace',
    'Real-time collaboration',
    'Powerful integrations',
    'Secure and reliable',
  ];

  protected readonly testimonials = [
    {
      quote: 'Workly has completely transformed how our team works. We’re more organized, more productive, and our team collaboration has never been better.',
      name: 'Sarah Johnson',
      role: 'CTO, TechCorp',
      initials: 'SJ',
    },
    {
      quote: 'The best project management tool we’ve used. It’s simple, powerful, and our whole team loves it.',
      name: 'Michael Chen',
      role: 'Product Lead, InnovateCo',
      initials: 'MC',
    },
    {
      quote: 'Workly helps us keep everything in one place. It’s been a game-changer for our remote team.',
      name: 'Priya Sharma',
      role: 'Operations Manager, GrowthLabs',
      initials: 'PS',
    },
  ];

  protected readonly pricingPlans = [
    {
      name: 'Free',
      description: 'Perfect for small teams getting started.',
      price: '$0',
      interval: '/month',
      features: ['Up to 5 team members', 'Basic features', 'Community support'],
      featured: false,
      cta: 'Get Started',
    },
    {
      name: 'Pro',
      description: 'For growing teams that need more power.',
      price: '$12',
      interval: '/month',
      features: ['Unlimited team members', 'Advanced features', 'Priority support'],
      featured: true,
      cta: 'Get Started',
    },
    {
      name: 'Business',
      description: 'For large teams with advanced needs.',
      price: '$24',
      interval: '/month',
      features: ['Everything in Pro', 'Advanced security', 'Dedicated support'],
      featured: false,
      cta: 'Get Started',
    },
  ];

  protected readonly footerColumns = [
    {
      title: 'Product',
      items: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    },
    {
      title: 'Company',
      items: ['About', 'Careers', 'Blog', 'Contact'],
    },
    {
      title: 'Resources',
      items: ['Help Center', 'Documentation', 'Community', 'Status'],
    },
    {
      title: 'Legal',
      items: ['Privacy', 'Terms', 'Cookie Policy', 'Security'],
    },
  ];

  protected toggleMenu(): void {
    this.mobileMenuOpen.update((value) => !value);
  }
}
