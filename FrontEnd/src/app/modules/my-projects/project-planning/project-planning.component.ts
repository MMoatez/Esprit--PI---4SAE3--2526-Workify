import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MyProjectsService } from '../../../core/services/my-projects.service';
import { Planning, Colonne, Tache, CreateColonneDto, CreateTacheDto } from '../../../core/models/my-project.model';
import { MeetingService } from '../../../core/services/meeting.service';
import { CreateMeetingDto, Meeting, MeetingProposal, MeetingStatus } from '../../../core/models/meeting.model';

@Component({
  standalone: false,
  selector: 'app-project-planning',
  templateUrl: './project-planning.component.html',
  styleUrls: ['./project-planning.component.css']
})
export class ProjectPlanningComponent implements OnInit {
  projectId!: number;
  planning?: Planning;
  visibleColonnes: Colonne[] = [];
  loading = true;
  isDarkMode = true;
  currentUserId = 0;

  meetings: Meeting[] = [];
  isCalendarOpen = false;
  showCreateMeetingModal = false;
  showNotesModal = false;
  showCancelModal = false;
  showRejectModal = false;
  selectedMeetingForNotes?: Meeting;
  selectedMeetingForCancel?: Meeting;
  selectedMeetingForReject?: Meeting;
  meetingNotes = '';
  cancellationReason = '';
  rejectionReason = '';
  tempDate = '';
  validationErrors: string[] = [];
  showValidationError = false;

  newMeeting: {
    title: string;
    description: string;
    durationMinutes: number;
    proposedDates: string[];
    isOnline: boolean;
    meetingLink: string;
  } = {
    title: '',
    description: '',
    durationMinutes: 60,
    proposedDates: [],
    isOnline: true,
    meetingLink: ''
  };

  readonly MeetingStatus = MeetingStatus;
  
  // Modal states
  showAddColumnModal = false;
  showAddTaskModal = false;
  showEditColumnModal = false;
  selectedColonne?: Colonne;
  selectedColonneForTask?: Colonne;
  
  // Form models
  newColumn: CreateColonneDto = {
    idPlanning: 0,
    name: '',
    color: '#3B82F6',
    description: ''
  };
  
  newTask: CreateTacheDto = {
    task: '',
    idColonne: 0
  };
  
  editColumn: Partial<Colonne> = {};

  // Predefined colors
  colors = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: MyProjectsService,
    private meetingService: MeetingService
  ) {}

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('planningBoardTheme', this.isDarkMode ? 'dark' : 'light');
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('planningBoardTheme');
    this.isDarkMode = savedTheme !== 'light';
    this.initCurrentUserId();
    
    this.route.params.subscribe(params => {
      this.projectId = +params['id'];
      this.loadPlanning();
    });
  }

  loadPlanning(): void {
    this.loading = true;
    this.projectsService.getPlanningByProjectId(this.projectId).subscribe({
      next: (planning) => {
        this.planning = this.normalizePlanning(planning);
        this.syncVisibleColonnes();
        this.newColumn.idPlanning = this.planning.id!;

        if (!this.planning.colonnes.length) {
          this.createDefaultColumns();
          return;
        }

        this.loading = false;
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error loading planning:', err);
        // Si pas de planning, en créer un
        if (err.status === 404) {
          this.createInitialPlanning();
        } else {
          this.loading = false;
        }
      }
    });
  }

  createInitialPlanning(): void {
    this.projectsService.createPlanning(this.projectId).subscribe({
      next: (planning) => {
        this.planning = this.normalizePlanning(planning);
        this.syncVisibleColonnes();
        this.newColumn.idPlanning = this.planning.id!;
        this.loading = false;
        this.loadPlanning();
      },
      error: (err) => {
        console.error('Error creating planning:', err);
        this.loading = false;
      }
    });
  }

  createDefaultColumns(): void {
    if (!this.planning?.id) {
      this.loading = false;
      return;
    }

    const defaultColumns = [
      { name: 'To do', color: '#10B981', description: 'This item hasn\'t been started' },
      { name: 'In Progress', color: '#F59E0B', description: 'This is actively being worked on' },
      { name: 'Done', color: '#3B82F6', description: 'This has been completed' }
    ];

    let completed = 0;
    defaultColumns.forEach(col => {
      const colDto: CreateColonneDto = {
        idPlanning: this.planning!.id!,
        name: col.name,
        color: col.color,
        description: col.description
      };

      this.projectsService.createColonne(colDto).subscribe({
        next: (colonne) => {
          if (!this.planning!.colonnes) {
            this.planning!.colonnes = [];
          }
          this.planning!.colonnes.push(this.normalizeColonne(colonne));
          this.syncVisibleColonnes();
          completed++;
          if (completed === defaultColumns.length) {
            this.loading = false;
            this.loadPlanning();
          }
        },
        error: (err) => {
          console.error('Error creating default column:', err);
          completed++;
          if (completed === defaultColumns.length) {
            this.loading = false;
            this.loadMeetings();
          }
        }
      });
    });
  }

  normalizePlanning(planning: Planning): Planning {
    const normalized = {
      ...planning,
      colonnes: (planning.colonnes || []).map((c) => this.normalizeColonne(c))
    };
    return normalized;
  }

  normalizeColonne(colonne: Colonne): Colonne {
    return {
      ...colonne,
      taches: colonne?.taches || []
    };
  }

  syncVisibleColonnes(): void {
    this.visibleColonnes = (this.planning?.colonnes || [])
      .filter((c): c is Colonne => !!c)
      .map((c) => {
        if (!c.taches) {
          c.taches = [];
        }
        return c;
      });
  }

  initCurrentUserId(): void {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) {
      this.currentUserId = 0;
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      this.currentUserId = Number(user?.userId || user?.id || 0);
    } catch {
      this.currentUserId = 0;
    }
  }

  // ========== DRAG & DROP ==========
  
  drop(event: CdkDragDrop<Tache[]>, colonneId: number): void {
  if (event.previousContainer === event.container) {
    // Réorganiser dans la même colonne
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  } else {
    // Déplacer vers une autre colonne
    const tache = event.previousContainer.data[event.previousIndex];
    
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // ✅ Mettre à jour dans le backend
    if (tache.id) {
      this.projectsService.moveTache(tache.id, colonneId).subscribe({
        next: () => {
          console.log('✅ Task moved successfully to column:', colonneId);
          // Mettre à jour l'idColonne localement
          tache.idColonne = colonneId;
        },
        error: (err) => {
          console.error('❌ Error moving task:', err);
          // En cas d'erreur, annuler le mouvement visuellement
          transferArrayItem(
            event.container.data,
            event.previousContainer.data,
            event.currentIndex,
            event.previousIndex
          );
        }
      });
    }
  }
}

  // ========== COLONNES ==========
  
  openAddColumnModal(): void {
    if (!this.planning?.id) {
      alert('Planning is not ready yet. Please wait a moment and retry.');
      return;
    }

    this.newColumn = {
      idPlanning: this.planning!.id!,
      name: '',
      color: '#3B82F6',
      description: ''
    };
    this.showAddColumnModal = true;
  }

  addColumn(): void {
    if (!this.newColumn.name.trim()) return;

    if (!this.planning?.id) {
      console.error('Cannot create column: planning id missing');
      return;
    }

    this.newColumn.idPlanning = this.planning.id;

    this.projectsService.createColonne(this.newColumn).subscribe({
      next: () => {
        this.showAddColumnModal = false;
        this.newColumn.name = '';
        this.newColumn.description = '';
        this.loadPlanning();
      },
      error: (err) => {
        console.error('Error creating column:', err);
        alert('Unable to create this column. Please try again.');
      }
    });
  }

  openEditColumnModal(colonne: Colonne): void {
    this.selectedColonne = colonne;
    this.editColumn = { ...colonne };
    this.showEditColumnModal = true;
  }

  updateColumn(): void {
    if (!this.selectedColonne?.id) return;

    this.projectsService.updateColonne(this.selectedColonne.id, this.editColumn).subscribe({
      next: (updated) => {
        const index = this.planning!.colonnes.findIndex(c => c.id === updated.id);
        if (index !== -1) {
          this.planning!.colonnes[index] = this.normalizeColonne(updated);
          this.syncVisibleColonnes();
        }
        this.showEditColumnModal = false;
      },
      error: (err) => console.error('Error updating column:', err)
    });
  }

  deleteColumn(colonneId: number): void {
    if (!confirm('Are you sure you want to delete this column and all its tasks?')) return;

    this.projectsService.deleteColonne(colonneId).subscribe({
      next: () => {
        this.planning!.colonnes = this.planning!.colonnes.filter(c => c.id !== colonneId);
        this.syncVisibleColonnes();
      },
      error: (err) => console.error('Error deleting column:', err)
    });
  }

  // ========== TÂCHES ==========
  
  openAddTaskModal(colonne: Colonne): void {
    this.selectedColonneForTask = colonne;
    this.newTask = {
      task: '',
      idColonne: colonne.id!
    };
    this.showAddTaskModal = true;
  }

  addTask(): void {
    if (!this.newTask.task.trim()) return;

    this.projectsService.createTache(this.newTask).subscribe({
      next: (tache) => {
        const colonne = this.planning!.colonnes.find(c => c.id === tache.idColonne);
        if (colonne) {
          if (!colonne.taches) {
            colonne.taches = [];
          }
          colonne.taches.push(tache);
          this.syncVisibleColonnes();
        }
        this.showAddTaskModal = false;
      },
      error: (err) => console.error('Error creating task:', err)
    });
  }

  deleteTask(tacheId: number, colonneId: number): void {
    if (!confirm('Delete this task?')) return;

    this.projectsService.deleteTache(tacheId).subscribe({
      next: () => {
        const colonne = this.planning!.colonnes.find(c => c.id === colonneId);
        if (colonne) {
          colonne.taches = colonne.taches.filter(t => t.id !== tacheId);
          this.syncVisibleColonnes();
        }
      },
      error: (err) => console.error('Error deleting task:', err)
    });
  }

  // ========== UTILS ==========
  
  goBack(): void {
    this.router.navigate(['/my-projects', this.projectId]);
  }

  getConnectedLists(): string[] {
    return this.visibleColonnes
      .map((c) => c.id)
      .filter((id): id is number => typeof id === 'number')
      .map((id) => `column-${id}`);
  }

  getTotalTasks(): number {
    return (this.planning?.colonnes || []).reduce((sum, c) => sum + (c.taches?.length || 0), 0);
  }

  getTaskCountByColumnName(columnName: string): number {
    const column = (this.planning?.colonnes || []).find(
      (c) => (c.name || '').trim().toLowerCase() === columnName.trim().toLowerCase()
    );
    return column?.taches?.length || 0;
  }

  getDonePercentage(): number {
    const total = this.getTotalTasks();
    if (!total) {
      return 0;
    }

    const done = this.getTaskCountByColumnName('Done');
    return Math.round((done / total) * 100);
  }

  toggleCalendar(): void {
    this.isCalendarOpen = !this.isCalendarOpen;
    if (this.isCalendarOpen) {
      this.loadMeetings();
    }
  }

  loadMeetings(): void {
    this.meetingService.getMeetingsByProject(this.projectId).subscribe({
      next: (meetings) => {
        this.meetings = meetings || [];
      },
      error: (err) => {
        console.error('Error loading meetings:', err);
      }
    });
  }

  openCreateMeetingModal(): void {
    this.resetNewMeeting();
    this.showCreateMeetingModal = true;
  }

  resetNewMeeting(): void {
    this.newMeeting = {
      title: '',
      description: '',
      durationMinutes: 60,
      proposedDates: [],
      isOnline: true,
      meetingLink: ''
    };
    this.tempDate = '';
    this.validationErrors = [];
    this.showValidationError = false;
  }

  addProposedDate(): void {
    if (!this.tempDate) {
      return;
    }

    const isoDate = new Date(this.tempDate).toISOString();
    if (!this.newMeeting.proposedDates.includes(isoDate)) {
      this.newMeeting.proposedDates.push(isoDate);
    }

    this.tempDate = '';
  }

  removeProposedDate(index: number): void {
    this.newMeeting.proposedDates.splice(index, 1);
  }

  validateMeetingForm(): boolean {
    this.validationErrors = [];

    if (!this.newMeeting.title.trim()) {
      this.validationErrors.push('Meeting title is required');
    }

    if (!this.newMeeting.description.trim()) {
      this.validationErrors.push('Meeting description is required');
    }

    if (this.newMeeting.proposedDates.length === 0) {
      this.validationErrors.push('At least one proposed date is required');
    }

    if (this.newMeeting.isOnline && !this.newMeeting.meetingLink.trim()) {
      this.validationErrors.push('Meeting link is required for online meetings');
    }

    this.showValidationError = this.validationErrors.length > 0;
    return this.validationErrors.length === 0;
  }

  createMeeting(): void {
    if (!this.currentUserId) {
      alert('Please login first.');
      return;
    }

    if (!this.validateMeetingForm()) {
      return;
    }

    const dto: CreateMeetingDto = {
      projetId: this.projectId,
      title: this.newMeeting.title.trim(),
      description: this.newMeeting.description.trim(),
      durationMinutes: this.newMeeting.durationMinutes,
      createdBy: this.currentUserId,
      proposedDates: this.newMeeting.proposedDates,
      participantIds: [],
      isOnline: this.newMeeting.isOnline,
      meetingLink: this.newMeeting.meetingLink.trim()
    };

    this.meetingService.createMeeting(dto).subscribe({
      next: () => {
        this.showCreateMeetingModal = false;
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error creating meeting:', err);
        alert('Failed to create meeting.');
      }
    });
  }

  getPendingMeetings(): Meeting[] {
    return this.meetings.filter((m) => m.status === MeetingStatus.PROPOSED);
  }

  getUpcomingAndCompletedMeetings(): Meeting[] {
    return this.meetings.filter(
      (m) => m.status === MeetingStatus.CONFIRMED || m.status === MeetingStatus.COMPLETED
    );
  }

  getRejectedMeetings(): Meeting[] {
    return this.meetings.filter((m) => m.status === MeetingStatus.REJECTED);
  }

  getCancelledMeetings(): Meeting[] {
    return this.meetings.filter((m) => m.status === MeetingStatus.CANCELLED);
  }

  hasUserVoted(proposal: MeetingProposal): boolean {
    return (proposal.votedByUserIds || []).includes(this.currentUserId);
  }

  canUserVote(meeting: Meeting): boolean {
    return meeting.createdByUserId !== this.currentUserId;
  }

  voteForProposal(proposalId: number): void {
    if (!this.currentUserId) {
      alert('Please login first.');
      return;
    }

    this.meetingService.voteForProposal({ proposalId, userId: this.currentUserId }).subscribe({
      next: () => this.loadMeetings(),
      error: (err) => {
        console.error('Error voting for proposal:', err);
        alert(err?.error?.message || 'Unable to vote on this proposal.');
      }
    });
  }

  openNotesModal(meeting: Meeting): void {
    this.selectedMeetingForNotes = meeting;
    this.meetingNotes = meeting.meetingNotes || '';
    this.showNotesModal = true;
  }

  saveMeetingNotes(): void {
    if (!this.selectedMeetingForNotes?.id) {
      return;
    }

    const meetingId = this.selectedMeetingForNotes.id;
    const request = this.selectedMeetingForNotes.status === MeetingStatus.COMPLETED
      ? this.meetingService.updateMeetingNotes(meetingId, this.meetingNotes)
      : this.meetingService.completeMeeting(meetingId, this.meetingNotes, this.currentUserId);

    request.subscribe({
      next: () => {
        this.showNotesModal = false;
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error saving notes:', err);
        alert('Unable to save meeting notes.');
      }
    });
  }

  openCancelModal(meeting: Meeting): void {
    this.selectedMeetingForCancel = meeting;
    this.cancellationReason = '';
    this.showCancelModal = true;
  }

  cancelMeeting(): void {
    if (!this.selectedMeetingForCancel?.id) {
      return;
    }

    this.meetingService.cancelMeeting(
      this.selectedMeetingForCancel.id,
      this.cancellationReason,
      this.currentUserId
    ).subscribe({
      next: () => {
        this.showCancelModal = false;
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error cancelling meeting:', err);
        alert('Unable to cancel meeting.');
      }
    });
  }

  openRejectModal(meeting: Meeting): void {
    this.selectedMeetingForReject = meeting;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  rejectMeeting(): void {
    if (!this.selectedMeetingForReject?.id) {
      return;
    }

    this.meetingService.rejectMeeting(
      this.selectedMeetingForReject.id,
      this.rejectionReason,
      this.currentUserId
    ).subscribe({
      next: () => {
        this.showRejectModal = false;
        this.loadMeetings();
      },
      error: (err) => {
        console.error('Error rejecting meeting:', err);
        alert('Unable to reject meeting.');
      }
    });
  }

  trackByMeetingId(_index: number, meeting: Meeting): number | undefined {
    return meeting.id;
  }

  trackByColonneId(index: number, colonne: Colonne): number | string {
    return colonne.id ?? `col-${index}`;
  }

  trackByTaskId(index: number, tache: Tache): number | string {
    return tache.id ?? `task-${index}`;
  }
}