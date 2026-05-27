import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormationService, Enrollment } from '../../formation/formation.service';

@Component({
    selector: 'app-my-formations',
    standalone: false,
    templateUrl: './my-formations.component.html',
    styleUrls: ['./my-formations.component.scss']
})
export class MyFormationsComponent implements OnInit {
    enrollments: Enrollment[] = [];
    loading = true;

    constructor(
        private formationService: FormationService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadMyEnrollments();
    }

    loadMyEnrollments(): void {
        this.formationService.getMyEnrollments().subscribe({
            next: (data) => {
                this.enrollments = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading enrollments', err);
                this.loading = false;
            }
        });
    }

    goToCourse(id: number): void {
        this.router.navigate(['/formation', id, 'play']);
    }
}
