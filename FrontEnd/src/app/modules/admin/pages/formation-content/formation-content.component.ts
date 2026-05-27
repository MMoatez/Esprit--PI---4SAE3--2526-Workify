import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormationService, Formation, Chapter, Lesson } from '../../../formation/formation/formation.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-formation-content',
    standalone: false,
    templateUrl: './formation-content.component.html',
    styleUrls: ['./formation-content.component.scss']
})
export class FormationContentComponent implements OnInit {
    formationId: number | null = null;
    formation: Formation | null = null;
    chapters: Chapter[] = [];
    chapterLessons: { [key: number]: Lesson[] } = {};

    // Modals
    showChapterModal = false;
    showLessonModal = false;
    editingChapter: Chapter | null = null;
    editingLesson: Lesson | null = null;

    chapterForm = {
        title: '',
        position: 0
    };

    lessonForm = {
        title: '',
        content: '',
        videoUrl: '',
        position: 0,
        chapterId: 0
    };

    selectedPdfFile: File | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formationService: FormationService
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

        this.formationService.getFormationById(this.formationId).subscribe((data: Formation) => {
            this.formation = data;
        });

        this.loadChapters();
    }

    loadChapters(): void {
        if (!this.formationId) return;
        this.formationService.getChapters(this.formationId!).subscribe({
            next: (chapters) => {
                this.chapters = chapters;
                this.chapters.forEach(c => this.loadLessons(c.id!));
            },
            error: (err) => {
                console.error('Error loading chapters:', err);
                alert('Error loading chapters: ' + (err.error?.message || err.message));
            }
        });
    }

    loadLessons(chapterId: number): void {
        this.formationService.getLessons(chapterId).subscribe({
            next: (lessons) => {
                this.chapterLessons[chapterId] = lessons;
            },
            error: (err) => {
                console.error(`Error loading lessons for chapter ${chapterId}:`, err);
            }
        });
    }

    // Chapter Actions
    openChapterModal(chapter?: Chapter): void {
        if (chapter) {
            this.editingChapter = chapter;
            this.chapterForm = { title: chapter.title, position: chapter.position || 0 };
        } else {
            this.editingChapter = null;
            this.chapterForm = { title: '', position: this.chapters.length + 1 };
        }
        this.showChapterModal = true;
    }

    closeChapterModal(): void {
        this.showChapterModal = false;
        this.editingChapter = null;
    }

    saveChapter(): void {
        if (!this.formationId) return;

        const chapterData: Chapter = {
            ...this.chapterForm,
            formationId: this.formationId
        };

        if (this.editingChapter) {
            this.formationService.updateChapter(this.editingChapter.id!, chapterData).subscribe({
                next: () => {
                    this.loadChapters();
                    this.closeChapterModal();
                },
                error: (err) => {
                    console.error('Error updating chapter:', err);
                    alert('Error updating chapter: ' + (err.error?.message || err.message));
                }
            });
        } else {
            this.formationService.createChapter(chapterData).subscribe({
                next: () => {
                    this.loadChapters();
                    this.closeChapterModal();
                },
                error: (err) => {
                    console.error('Error creating chapter:', err);
                    alert('Error creating chapter: ' + (err.error?.message || err.message));
                }
            });
        }
    }

    editChapter(chapter: Chapter): void {
        this.openChapterModal(chapter);
    }

    deleteChapter(id: number): void {
        if (confirm('Are you sure you want to delete this chapter and all its lessons?')) {
            this.formationService.deleteChapter(id).subscribe(() => {
                this.loadChapters();
            });
        }
    }

    // Lesson Actions
    openLessonModal(chapter: Chapter, lesson?: Lesson): void {
        if (lesson) {
            this.editingLesson = lesson;
            this.lessonForm = {
                title: lesson.title,
                content: lesson.content,
                videoUrl: lesson.videoUrl || '',
                position: lesson.position || 0,
                chapterId: chapter.id!
            };
        } else {
            this.editingLesson = null;
            const currentLessonsCount = this.chapterLessons[chapter.id!]?.length || 0;
            this.lessonForm = {
                title: '',
                content: '',
                videoUrl: '',
                position: currentLessonsCount + 1,
                chapterId: chapter.id!
            };
        }
        this.selectedPdfFile = null;
        this.showLessonModal = true;
    }

    onPdfFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedPdfFile = input.files[0];
        } else {
            this.selectedPdfFile = null;
        }
    }

    closeLessonModal(): void {
        this.showLessonModal = false;
        this.editingLesson = null;
    }

    saveLesson(): void {
        const lessonData: Lesson = {
            ...this.lessonForm
        };

        const pdfFile = this.selectedPdfFile;

        if (this.editingLesson) {
            this.formationService.updateLesson(this.editingLesson.id!, lessonData).pipe(
                switchMap((saved: Lesson) => {
                    if (pdfFile) {
                        return this.formationService.uploadLessonPdf(saved.id!, pdfFile);
                    }
                    return of(saved);
                })
            ).subscribe({
                next: () => {
                    this.loadLessons(lessonData.chapterId);
                    this.closeLessonModal();
                },
                error: (err) => {
                    console.error('Error updating lesson:', err);
                    alert('Error updating lesson: ' + (err.error?.message || err.message));
                }
            });
        } else {
            this.formationService.createLesson(lessonData).pipe(
                switchMap((saved: Lesson) => {
                    if (pdfFile) {
                        return this.formationService.uploadLessonPdf(saved.id!, pdfFile);
                    }
                    return of(saved);
                })
            ).subscribe({
                next: () => {
                    this.loadLessons(lessonData.chapterId);
                    this.closeLessonModal();
                },
                error: (err) => {
                    console.error('Error creating lesson:', err);
                    alert('Error creating lesson: ' + (err.error?.message || err.message));
                }
            });
        }
    }

    editLesson(lesson: Lesson): void {
        // We need to find the chapter for this lesson to open the modal
        const chapter = this.chapters.find(ch => ch.id === lesson.chapterId);
        if (chapter) {
            this.openLessonModal(chapter, lesson);
        }
    }

    deleteLesson(id: number): void {
        if (confirm('Are you sure you want to delete this lesson?')) {
            const lesson = this.findLesson(id);
            this.formationService.deleteLesson(id).subscribe(() => {
                if (lesson) this.loadLessons(lesson.chapterId);
            });
        }
    }

    private findLesson(id: number): Lesson | undefined {
        for (const chId in this.chapterLessons) {
            const lesson = this.chapterLessons[chId].find(l => l.id === id);
            if (lesson) return lesson;
        }
        return undefined;
    }

    goBack(): void {
        this.router.navigate(['/admin/formations']);
    }
}
