import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'workifyFrantOffice';
  showFooter = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Scroll to top on every route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.showFooter = !event.urlAfterRedirects.startsWith('/chatbot');

      // Smooth scroll to top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    });

    this.showFooter = !this.router.url.startsWith('/chatbot');
  }
} 