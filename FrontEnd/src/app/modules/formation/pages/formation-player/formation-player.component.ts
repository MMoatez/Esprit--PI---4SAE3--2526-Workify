import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormationService, Formation, Chapter, Lesson, Enrollment, ReviewRequest } from '../../formation/formation.service';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-formation-player',
    standalone: false,
    templateUrl: './formation-player.component.html',
    styleUrls: ['./formation-player.component.scss']
})
export class FormationPlayerComponent implements OnInit {
    formationId: number | null = null;
    formation: Formation | null = null;
    chapters: Chapter[] = [];
    chapterLessons: { [key: number]: Lesson[] } = {};
    enrollment: Enrollment | null = null;

    currentLesson: Lesson | null = null;
    videoUrlSafe: SafeResourceUrl | null = null;
    pdfUrlSafe: SafeResourceUrl | null = null;

    openChapters: Set<number> = new Set();
    completedLessonIds: Set<number> = new Set();
    unlockedError: string | null = null;
    private errorTimeout: any;

    showRatingForm = false;
    userReview: ReviewRequest = { rating: 0, comment: '', formationId: 0 };
    alreadyReviewed = false;

    sidebarVisible = true;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private formationService: FormationService,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.formationId = +id;
            this.loadData();
        }
    }

    loadData(): void {
        if (!this.formationId) return;

        // Load Formation details
        this.formationService.getFormationById(this.formationId).subscribe((data: Formation) => {
            this.formation = data;
        });

        // Load Enrollment (to get progress/status)
        this.formationService.checkEnrollment(this.formationId).subscribe(
            (enrollment: Enrollment) => {
                this.enrollment = enrollment;
                if (enrollment.completedLessonIds) {
                    this.completedLessonIds = new Set(enrollment.completedLessonIds);
                }
                if (enrollment.status === 'COMPLETED') {
                    this.checkIfAlreadyReviewed();
                }
            },
            (error: any) => {
                console.error('Enrollment check failed:', error);
                if (error.status === 404 || error.status === 401) {
                    this.router.navigate(['/formation', this.formationId]);
                } else {
                    this.loading = false;
                    alert('Error checking enrollment: ' + error.status + ' ' + error.message);
                }
            }
        );

        // Load Content
        this.formationService.getChapters(this.formationId).subscribe((chapters: Chapter[]) => {
            this.chapters = chapters;
            if (chapters.length > 0) {
                this.openChapters.add(chapters[0].id!);
            }

            let loadedChaptersCount = 0;
            chapters.forEach(ch => {
                this.formationService.getLessons(ch.id!).subscribe((lessons: Lesson[]) => {
                    this.chapterLessons[ch.id!] = lessons;
                    loadedChaptersCount++;

                    // Auto-select first lesson if none selected
                    if (!this.currentLesson && lessons.length > 0 && ch.id === chapters[0].id) {
                        this.selectLesson(lessons[0]);
                    }

                    if (loadedChaptersCount === chapters.length) {
                        this.loading = false;
                    }
                });
            });
        });
    }

    selectLesson(lesson: Lesson): void {
        if (!this.isLessonUnlocked(lesson)) {
            this.showUnlockedError();
            return;
        }

        this.currentLesson = lesson;
        if (lesson.videoUrl) {
            this.videoUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.convertToEmbedUrl(lesson.videoUrl));
        } else {
            this.videoUrlSafe = null;
        }
        if (lesson.pdfUrl) {
            const fullPdfUrl = `${environment.formationApiUrl}${lesson.pdfUrl}`;
            this.pdfUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(fullPdfUrl);
        } else {
            this.pdfUrlSafe = null;
        }
    }

    private showUnlockedError(): void {
        this.unlockedError = "You need to finish the previous lesson first!";
        if (this.errorTimeout) clearTimeout(this.errorTimeout);
        this.errorTimeout = setTimeout(() => {
            this.unlockedError = null;
        }, 5000);
    }

    get allLessons(): Lesson[] {
        const flattened: Lesson[] = [];
        this.chapters.forEach(ch => {
            if (this.chapterLessons[ch.id!]) {
                flattened.push(...this.chapterLessons[ch.id!]);
            }
        });
        return flattened;
    }

    isLessonUnlocked(lesson: Lesson): boolean {
        const all = this.allLessons;
        const idx = all.findIndex(l => l.id === lesson.id);
        if (idx <= 0) return true; // First lesson is always unlocked
        return this.isLessonCompleted(all[idx - 1].id!);
    }

    private convertToEmbedUrl(url: string): string {
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/');
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'youtube.com/embed/');
        }
        return url;
    }

    toggleChapter(chapterId: number): void {
        if (this.openChapters.has(chapterId)) {
            this.openChapters.delete(chapterId);
        } else {
            this.openChapters.add(chapterId);
        }
    }

    isChapterOpen(chapterId: number): boolean {
        return this.openChapters.has(chapterId);
    }

    isLessonCompleted(lessonId: number): boolean {
        return this.completedLessonIds.has(lessonId);
    }

    markComplete(): void {
        if (!this.currentLesson?.id) return;

        this.formationService.completeLesson(this.currentLesson.id).subscribe({
            next: () => {
                this.completedLessonIds.add(this.currentLesson!.id!);
                // Refresh enrollment to see if course is now COMPLETED
                if (this.formationId) {
                    this.formationService.checkEnrollment(this.formationId).subscribe((e: Enrollment) => {
                        this.enrollment = e;
                        if (e.status === 'COMPLETED') {
                            this.showRatingForm = true;
                            this.currentLesson = null; // Return to welcome screen to show rating
                        }
                    });
                }
            },
            error: (err: any) => console.error('Error completing lesson', err)
        });
    }

    get progressPercentage(): number {
        const totalLessons = Object.values(this.chapterLessons).reduce((acc, curr) => acc + curr.length, 0);
        if (totalLessons === 0) return 0;
        return Math.round((this.completedLessonIds.size / totalLessons) * 100);
    }

    get canTakeQuiz(): boolean {
        return this.progressPercentage === 100;
    }

    startQuiz(): void {
        if (this.formationId) {
            this.router.navigate(['/formation', this.formationId, 'quiz']);
        }
    }

    hasNextLesson(): boolean {
        if (!this.currentLesson) return false;
        const { chapterId } = this.currentLesson;
        const lessonsInChapter = this.chapterLessons[chapterId];

        if (!lessonsInChapter) return false;

        // Check in current chapter
        const currentIdx = lessonsInChapter.findIndex(l => l.id === this.currentLesson?.id);
        if (currentIdx !== -1 && currentIdx < lessonsInChapter.length - 1) return true;

        // Check next chapters
        const currentChapterIdx = this.chapters.findIndex(ch => ch.id === chapterId);
        if (currentChapterIdx === -1) return false;

        for (let i = currentChapterIdx + 1; i < this.chapters.length; i++) {
            const nextLessons = this.chapterLessons[this.chapters[i].id!];
            if (nextLessons && nextLessons.length > 0) return true;
        }

        return false;
    }

    hasPreviousLesson(): boolean {
        if (!this.currentLesson) return false;
        const { chapterId } = this.currentLesson;
        const lessonsInChapter = this.chapterLessons[chapterId];

        if (!lessonsInChapter) return false;

        // Check in current chapter
        const currentIdx = lessonsInChapter.findIndex(l => l.id === this.currentLesson?.id);
        if (currentIdx > 0) return true;

        // Check previous chapters
        const currentChapterIdx = this.chapters.findIndex(ch => ch.id === chapterId);
        if (currentChapterIdx === -1) return false;

        for (let i = currentChapterIdx - 1; i >= 0; i--) {
            const prevLessons = this.chapterLessons[this.chapters[i].id!];
            if (prevLessons && prevLessons.length > 0) return true;
        }

        return false;
    }

    nextLesson(): void {
        if (!this.currentLesson) return;

        // Check if current lesson is completed before moving to next
        if (!this.isLessonCompleted(this.currentLesson.id!)) {
            this.showUnlockedError();
            return;
        }

        const { chapterId } = this.currentLesson;
        const lessonsInChapter = this.chapterLessons[chapterId];

        if (!lessonsInChapter) return;

        const currentIdx = lessonsInChapter.findIndex(l => l.id === this.currentLesson?.id);

        if (currentIdx !== -1 && currentIdx < lessonsInChapter.length - 1) {
            this.selectLesson(lessonsInChapter[currentIdx + 1]);
        } else {
            const currentChapterIdx = this.chapters.findIndex(ch => ch.id === chapterId);
            if (currentChapterIdx === -1) return;

            for (let i = currentChapterIdx + 1; i < this.chapters.length; i++) {
                const nextChapterLessons = this.chapterLessons[this.chapters[i].id!];
                if (nextChapterLessons && nextChapterLessons.length > 0) {
                    this.openChapters.add(this.chapters[i].id!);
                    this.selectLesson(nextChapterLessons[0]);
                    break;
                }
            }
        }
    }

    previousLesson(): void {
        if (!this.currentLesson) return;
        const { chapterId } = this.currentLesson;
        const lessonsInChapter = this.chapterLessons[chapterId];

        if (!lessonsInChapter) return;

        const currentIdx = lessonsInChapter.findIndex(l => l.id === this.currentLesson?.id);

        if (currentIdx > 0) {
            this.selectLesson(lessonsInChapter[currentIdx - 1]);
        } else {
            const currentChapterIdx = this.chapters.findIndex(ch => ch.id === chapterId);
            if (currentChapterIdx === -1) return;

            for (let i = currentChapterIdx - 1; i >= 0; i--) {
                const prevChapterLessons = this.chapterLessons[this.chapters[i].id!];
                if (prevChapterLessons && prevChapterLessons.length > 0) {
                    this.openChapters.add(this.chapters[i].id!);
                    this.selectLesson(prevChapterLessons[prevChapterLessons.length - 1]);
                    break;
                }
            }
        }
    }

    goBack(): void {
        this.router.navigate(['/formation', this.formationId]);
    }

    checkIfAlreadyReviewed(): void {
        if (!this.formationId) return;
        this.formationService.getReviews(this.formationId).subscribe(reviews => {
            // Ideally we'd check if current user ID is in reviews, 
            // but the backend will block duplicate submissions anyway.
            // We'll show the form if the status is COMPLETED and we want to prompt them.
            this.showRatingForm = true;
        });
    }

    submitReview(): void {
        if (this.userReview.rating === 0) {
            alert('Please select a rating');
            return;
        }
        this.userReview.formationId = this.formationId!;
        this.formationService.submitReview(this.userReview).subscribe({
            next: () => {
                alert('Thank you for your review!');
                this.showRatingForm = false;
                this.alreadyReviewed = true;
            },
            error: (err) => {
                if (err.status === 400 && err.error?.message?.includes('already rated')) {
                    this.alreadyReviewed = true;
                    this.showRatingForm = false;
                } else {
                    alert(err.error?.message || 'Error submitting review');
                }
            }
        });
    }

    openRating(): void {
        this.currentLesson = null;
        this.showRatingForm = true;
    }
}
