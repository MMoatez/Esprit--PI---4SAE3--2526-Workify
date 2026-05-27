import { Component, OnInit } from '@angular/core';
import { FormationService, Certificate } from '../../formation/formation.service';
import { AuthService } from '../../../../core/services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CUSTOM_SIGNATURE_BASE64 } from './signature-base64';

@Component({
    selector: 'app-my-certificates',
    standalone: false,
    templateUrl: './my-certificates.component.html',
    styleUrls: ['./my-certificates.component.scss']
})
export class MyCertificatesComponent implements OnInit {
    certificates: Certificate[] = [];
    loading = true;
    userId: string | null = null;
    selectedCert: Certificate | null = null;
    profileName: string = 'Workify Member';
    signatureBase64 = CUSTOM_SIGNATURE_BASE64;

    constructor(
        private formationService: FormationService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.userId = this.authService.getUserId();
        // Try to get user name from token or profile logic (mocked here for simplicity)
        this.profileName = this.authService.getUserName() || 'Valued Learner';

        if (this.userId) {
            this.loadCertificates();
        } else {
            this.loading = false;
        }
    }

    loadCertificates(): void {
        if (!this.userId) return;
        this.formationService.getUserCertificates(this.userId).subscribe({
            next: (data: Certificate[]) => {
                this.certificates = data;
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error loading certificates', err);
                this.loading = false;
            }
        });
    }

    async downloadCertificate(cert: Certificate): Promise<void> {
        this.selectedCert = cert;

        // Wait for Angular to render the hidden template and images to load
        setTimeout(async () => {
            const element = document.getElementById('certificate-template');
            if (!element) return;

            try {
                const canvas = await html2canvas(element, {
                    scale: 3, // High quality
                    useCORS: true,
                    allowTaint: true,
                    logging: true,
                    backgroundColor: '#ffffff',
                    windowWidth: 1120,
                    windowHeight: 792,
                    x: 0,
                    y: 0,
                    scrollX: 0,
                    scrollY: 0
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [1120, 792]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, 1120, 792);
                pdf.save(`Certificate-${cert.formation.title.replace(/\s+/g, '-')}.pdf`);

                this.selectedCert = null; // Reset
            } catch (err) {
                console.error('Error generating PDF', err);
                alert('An error occurred while generating your certificate. Please try again.');
                this.selectedCert = null;
            }
        }, 500);
    }

    shareCertificate(cert: Certificate): void {
        // Logic to share on LinkedIn or social media
        const url = window.location.href;
        const text = `I just earned my certification in ${cert.formation.title} from Workify! 🎓`;
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`);
    }
}
