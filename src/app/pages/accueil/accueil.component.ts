import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './accueil.component.html',
})
export class AccueilComponent implements OnInit {
  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initScrollReveal();
      this.initMouseParallax();
    }
  }

  private initScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            if (entry.target.classList.contains('lg\\:grid-cols-4')) {
              const progress = document.getElementById('timeline-progress');
              if (progress) progress.style.width = '100%';
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    }, 0);
  }

  private initMouseParallax() {
    window.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.animate-float');
      const x = (window.innerWidth / 2 - e.pageX) / 40;
      const y = (window.innerHeight / 2 - e.pageY) / 40;
      cards.forEach((card, index) => {
        const depth = (index + 1) * 0.5;
        (card as HTMLElement).style.transform = `translate(${x * depth}px, ${y * depth}px)`;
      });
    });
  }
}
