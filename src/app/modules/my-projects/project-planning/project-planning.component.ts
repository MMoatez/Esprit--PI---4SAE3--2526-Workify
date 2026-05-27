import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MyProjectsService } from '../../../services/my-projects.service';
import { Planning, Colonne, Tache, CreateColonneDto, CreateTacheDto } from '../../../models/my-project.model';

@Component({
  selector: 'app-project-planning',
  templateUrl: './project-planning.component.html',
  styleUrls: ['./project-planning.component.css']
})
export class ProjectPlanningComponent implements OnInit {
  projectId!: number;
  planning?: Planning;
  loading = true;
  isDarkMode = true;
  
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
    private projectsService: MyProjectsService
  ) {}

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('planningBoardTheme', this.isDarkMode ? 'dark' : 'light');
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('planningBoardTheme');
    this.isDarkMode = savedTheme !== 'light';
    
    this.route.params.subscribe(params => {
      this.projectId = +params['id'];
      this.loadPlanning();
    });
  }

  loadPlanning(): void {
    this.loading = true;
    this.projectsService.getPlanningByProjectId(this.projectId).subscribe({
      next: (planning) => {
        this.planning = planning;
        this.newColumn.idPlanning = planning.id!;
        this.loading = false;
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
        this.planning = planning;
        this.newColumn.idPlanning = planning.id!;
        this.createDefaultColumns();
      },
      error: (err) => {
        console.error('Error creating planning:', err);
        this.loading = false;
      }
    });
  }

  createDefaultColumns(): void {
    const defaultColumns = [
      { name: 'Todo', color: '#10B981', description: 'This item hasn\'t been started' },
      { name: 'In Progress', color: '#F59E0B', description: 'This is actively being worked on' },
      { name: 'Done', color: '#8B5CF6', description: 'This has been completed' }
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
          this.planning!.colonnes.push(colonne);
          completed++;
          if (completed === defaultColumns.length) {
            this.loading = false;
          }
        }
      });
    });
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

    this.projectsService.createColonne(this.newColumn).subscribe({
      next: (colonne) => {
        if (!this.planning!.colonnes) {
          this.planning!.colonnes = [];
        }
        this.planning!.colonnes.push(colonne);
        this.showAddColumnModal = false;
      },
      error: (err) => console.error('Error creating column:', err)
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
          this.planning!.colonnes[index] = updated;
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
    return this.planning?.colonnes.map(c => `column-${c.id}`) || [];
  }
}