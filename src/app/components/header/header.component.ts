import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  mobileMenuOpen = false;
  currentPath = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Track current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentPath = event.url;
        this.mobileMenuOpen = false; // Close mobile menu on route change
      });

    // Set initial path
    this.currentPath = this.router.url;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  isActive(path: string): boolean {
    // Exact match for home
    if (path === '/' && this.currentPath === '/') {
      return true;
    }

    // For subscription, check exact match
    if (path === '/freelancers/subscription') {
      return this.currentPath === '/freelancers/subscription';
    }

    // For freelancers, exclude subscription route
    if (path === '/freelancers') {
      return (
        this.currentPath.startsWith('/freelancers') &&
        !this.currentPath.includes('/subscription')
      );
    }

    // For my-projects
    if (path === '/my-projects') {
      return this.currentPath.startsWith('/my-projects');
    }

    // For my-offers
    if (path === '/my-offers') {
      return this.currentPath.startsWith('/my-offers');
    }

    // For other routes, check if current path starts with the route
    if (path !== '/') {
      return this.currentPath.startsWith(path);
    }

    return false;
  }
}
