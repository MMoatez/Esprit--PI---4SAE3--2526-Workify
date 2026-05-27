import { Component, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../../../core/services/event.service';
import jsQR from 'jsqr';

type ScanState = 'idle' | 'scanning' | 'result';

@Component({
  selector: 'app-event-validator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-validator.component.html',
  styleUrls: ['./event-validator.component.css']
})
export class EventValidatorComponent implements OnInit, OnDestroy {

  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;

  state: ScanState = 'idle';
  result: any = null;
  errorMsg = '';
  manualToken = '';
  useCamera = true;
  cameraError = '';
  scanCount = 0;

  private stream: MediaStream | null = null;
  private scanInterval: any = null;

  constructor(private eventService: EventService, private router: Router) {}

  ngOnInit(): void {
    this.checkBarcodeSupport();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  checkBarcodeSupport(): void {
    // jsQR works in all browsers — no check needed
    this.useCamera = true;
    this.cameraError = '';
  }

  // ===========================
  // CAMERA SCANNER
  // ===========================

  async startCamera(): Promise<void> {
    this.state = 'scanning';
    this.result = null;
    this.errorMsg = '';
    this.cameraError = '';

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      // Give Angular time to render the video element
      setTimeout(() => this.attachStream(), 100);
    } catch (err: any) {
      this.cameraError = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
      this.state = 'idle';
    }
  }

  private attachStream(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || !this.stream) return;
    video.srcObject = this.stream;
    video.play();
    this.scanInterval = setInterval(() => this.detectFrame(), 300);
  }

  private detectFrame(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      this.stopCamera();
      this.submitScan(code.data);
    }
  }

  stopCamera(): void {
    clearInterval(this.scanInterval);
    this.scanInterval = null;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.state === 'scanning') this.state = 'idle';
  }

  // ===========================
  // VALIDATION
  // ===========================

  submitScan(token: string): void {
    if (!token.trim()) return;
    this.state = 'result';
    this.result = null;
    this.errorMsg = '';

    this.eventService.scanTicket(token.trim()).subscribe({
      next: res => {
        this.result = res;
        if (res.valid) this.scanCount++;
      },
      error: () => {
        this.result = { valid: false, message: 'Erreur de connexion au serveur' };
      }
    });
  }

  validateManual(): void {
    this.submitScan(this.manualToken);
  }

  // ===========================
  // ACTIONS
  // ===========================

  reset(): void {
    this.state = 'idle';
    this.result = null;
    this.errorMsg = '';
    this.manualToken = '';
    this.cameraError = '';
    this.stopCamera();
  }

  scanNext(): void {
    this.result = null;
    this.manualToken = '';
    if (this.useCamera) {
      this.startCamera();
    } else {
      this.state = 'idle';
    }
  }

  goBack(): void { this.router.navigate(['/events/admin/list']); }
}
