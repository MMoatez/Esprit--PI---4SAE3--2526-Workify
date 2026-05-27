import { Component, OnInit } from '@angular/core';
import { PackService } from '../../core/services/pack.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { Pack, Duration, DurationDisplay, PackOption, UserType } from '../../core/models/pack.model';
import {
  CreateSubscriptionDto,
  PaymentMethod,
  PaymentMethodDisplay,
  StatutsSubscription,
  SubscriptionResponse
} from '../../core/models/subscription.model';

interface PlanQuizAnswers {
  role: 'Freelancer' | 'Client' | 'Both';
  projectsPerMonth: '1-3' | '4-10' | '10+';
  messagingUsage: 'Rarely' | 'Often' | 'Intensively';
  visibilityNeed: 'No' | 'Medium' | 'High';
  advancedStats: boolean;
}

interface PlanQuizResult {
  recommendedPlan: string;
  message: string;
  reasons: string[];
  confidence: number;
  actionLabel?: string;
}

@Component({
  standalone: false,
  selector: 'app-freelancer-subscription',
  templateUrl: './freelancer-subscription.component.html',
  styleUrls: ['./freelancer-subscription.component.scss']
})
export class FreelancerSubscriptionComponent implements OnInit {
  packs: Pack[] = [];
  loading = true;
  error = '';

  readonly durations: Duration[] = [
    Duration.ONE_MONTH,
    Duration.THREE_MONTHS,
    Duration.SIX_MONTHS,
    Duration.ONE_YEAR
  ];
  selectedDuration: Duration = Duration.ONE_MONTH;
  durationDisplay = DurationDisplay;

  // Modal state
  showModal = false;
  selectedPack: Pack | null = null;
  /** 1 = choose method, 2 = fill details, 3 = success */
  step = 1;

  selectedPaymentMethod: PaymentMethod = PaymentMethod.BANK_TRANSFER;
  paymentMethods = [PaymentMethod.BANK_TRANSFER, PaymentMethod.BANK_DEPOSIT];
  paymentMethodDisplay = PaymentMethodDisplay;
  PaymentMethod = PaymentMethod;

  transactionReference = '';
  selectedFile: File | null = null;
  receiptError = '';

  submitting = false;
  submitError = '';

  activeSubscription: SubscriptionResponse | null = null;
  activeDaysRemaining = 0;

  showPlanChangeModal = false;
  planChangeTitle = '';
  planChangeMessage = '';
  planChangeConfirmLabel = 'Continue';
  planChangeMode: 'same-pack' | 'switch-pack' = 'switch-pack';
  pendingPack: Pack | null = null;

  showQuizModal = false;
  quizStep = 1;
  quizSubmitting = false;
  quizError = '';
  quizResult: PlanQuizResult | null = null;
  quizRoleLabel = 'Freelancer';
  quizNeedsTrainingCertifications = false;

  quizAnswers: PlanQuizAnswers = {
    role: 'Freelancer',
    projectsPerMonth: '1-3',
    messagingUsage: 'Rarely',
    visibilityNeed: 'Medium',
    advancedStats: false
  };

  readonly marketingPlans = [
    {
      title: 'Pro',
      subtitle: 'Perfect for getting started and boosting your visibility',
      description: 'A solid foundation to launch your activity and attract the right opportunities.',
      emoji: 'AI'
    },
    {
      title: 'Pro Max',
      subtitle: 'Ideal for professionals who want to scale faster',
      description: 'Built for users who need stronger performance, consistency, and growth tools.',
      emoji: 'Growth'
    },
    {
      title: 'Workify Premium',
      subtitle: 'Full experience with maximum power and visibility',
      description: 'Our most complete plan for users seeking premium impact and maximum reach.',
      emoji: 'Premium'
    }
  ];

  readonly BANK_FIELDS = [
    { label: 'Bank Name',      value: 'BIAT' },
    { label: 'Account Name',   value: 'Workify' },
    { label: 'Account Number', value: '1234567890' },
    { label: 'Routing Number', value: '987654321' },
    { label: 'SWIFT Code',     value: 'BIATTNTT' }
  ];

  constructor(
    private packService: PackService,
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeQuizRole();
    this.loadPacks();
    this.loadActiveSubscription();
  }

  loadPacks(): void {
    this.loading = true;
    this.packService.getAllPacks().subscribe({
      next: (packs) => {
        const allowedUserTypes = new Set<UserType>([
          UserType.FREELANCER,
          UserType.FREELANCER_CLIENT
        ]);

        this.packs = packs
          .filter((p) => allowedUserTypes.has(p.userType))
          .map((p) => this.normalizePack(p));

        this.packs.sort((a, b) => this.getDisplayPrice(a) - this.getDisplayPrice(b));
        this.loading = false;
      },
      error: () => { this.error = 'Unable to load subscription plans.'; this.loading = false; }
    });
  }

  private normalizePack(pack: Pack): Pack {
    const options = (pack.options && pack.options.length > 0)
      ? [...pack.options]
      : this.buildLegacyOptions(pack);

    const displayOption = this.resolveDisplayOption({ ...pack, options });

    return {
      ...pack,
      options,
      price: displayOption?.price ?? pack.price,
      duration: displayOption?.duration ?? pack.duration
    };
  }

  private resolveDisplayOption(pack: Pack): PackOption | undefined {
    if (!pack.options || pack.options.length === 0) {
      return undefined;
    }

    return pack.options.find((o) => o.active === true)
      ?? pack.options.find((o) => (o.price ?? 0) > 0)
      ?? pack.options[0];
  }

  private buildLegacyOptions(pack: Pack): PackOption[] {
    const duration = pack.duration ?? Duration.ONE_MONTH;
    const price = pack.price ?? 0;
    return [{ duration, price, active: true }];
  }

  getOption(pack: Pack, duration: Duration): PackOption | undefined {
    return (pack.options || []).find(o => o.duration === duration);
  }

  get displayPacks(): Pack[] {
    return [...this.packs];
  }

  getDurationText(duration?: Duration): string {
    const resolved = duration ?? Duration.ONE_MONTH;
    return DurationDisplay[resolved] || resolved;
  }

  getMonthlyPrice(pack: Pack): number {
    const duration = this.getDisplayDuration(pack);
    const months: Record<Duration, number> = {
      [Duration.ONE_MONTH]: 1,
      [Duration.THREE_MONTHS]: 3,
      [Duration.SIX_MONTHS]: 6,
      [Duration.ONE_YEAR]: 12
    };
    return this.getDisplayPrice(pack) / (months[duration] || 1);
  }

  isProfessional(pack: Pack): boolean {
    const name = (pack.name || '').toLowerCase();
    return name.includes('pro');
  }

  subscribe(pack: Pack): void {
    if (!this.authService.isLoggedIn()) {
      this.submitError = 'Please sign in to subscribe to a plan.';
      return;
    }

    if (this.activeSubscription && this.activeSubscription.packId === pack.id) {
      this.openPlanChangeModal('same-pack', pack);
      return;
    }

    if (this.activeSubscription && this.activeSubscription.packId !== pack.id) {
      this.openPlanChangeModal('switch-pack', pack);
      return;
    }

    this.startPurchaseFlow(pack);
  }

  closePlanChangeModal(): void {
    this.showPlanChangeModal = false;
    this.pendingPack = null;
  }

  confirmPlanChangeModal(): void {
    if (this.planChangeMode === 'same-pack') {
      this.closePlanChangeModal();
      return;
    }

    const targetPack = this.pendingPack;
    this.closePlanChangeModal();
    if (!targetPack) {
      return;
    }

    this.startPurchaseFlow(targetPack);
  }

  openQuiz(): void {
    this.showQuizModal = true;
    this.quizStep = 1;
    this.quizError = '';
    this.quizResult = null;
    this.quizNeedsTrainingCertifications = false;
  }

  closeQuiz(): void {
    this.showQuizModal = false;
  }

  nextQuizStep(): void {
    this.quizStep = Math.min(6, this.quizStep + 1);
  }

  prevQuizStep(): void {
    this.quizStep = Math.max(1, this.quizStep - 1);
  }

  getProjectsQuestionText(): string {
    if (this.quizAnswers.role === 'Client') {
      return '2) How many projects do you usually publish per month?';
    }
    return '2) How many projects do you usually manage per month?';
  }

  getProjectsOptionLabel(range: '1-3' | '4-10' | '10+'): string {
    if (this.quizAnswers.role === 'Client') {
      if (range === '1-3') return '1 project (Free plan limit)';
      if (range === '4-10') return '2 to 5 projects';
      return 'More than 5 projects';
    }

    if (range === '1-3') return '1 to 3 projects (Free plan limit)';
    if (range === '4-10') return '4 to 10 projects';
    return 'More than 10 projects';
  }

  getProjectsQuestionHint(): string {
    if (this.quizAnswers.role === 'Client') {
      return 'On Free plan, a client can publish up to 1 project per month.';
    }
    return 'On Free plan, a freelancer can manage up to 3 projects per month.';
  }

  submitQuiz(): void {
    this.quizSubmitting = true;
    this.quizError = '';

    const matching = this.packs.filter((p) => this.isPackVisibleForCurrentUser(p));
    if (matching.length === 0) {
      this.quizSubmitting = false;
      this.quizError = 'No eligible plans available for your profile.';
      return;
    }

    const recommendedPack = this.resolveRecommendedPackByQuiz(matching);
    if (!recommendedPack) {
      this.quizSubmitting = false;
      this.quizError = 'Unable to compute recommendation right now. Please try again.';
      return;
    }

    this.quizResult = {
      recommendedPlan: recommendedPack.name,
      message: `${recommendedPack.name} fits your current usage and growth needs best.`,
      reasons: this.buildQuizReasons(),
      confidence: this.computeQuizConfidence(),
      actionLabel: 'Choose this plan'
    };

    this.quizStep = 7;
    this.quizSubmitting = false;
  }

  chooseRecommendedPlan(): void {
    if (!this.quizResult) {
      return;
    }

    const targetPack = this.packs.find(
      (p) => this.isPackVisibleForCurrentUser(p)
        && (p.name || '').trim().toLowerCase() === this.quizResult!.recommendedPlan.trim().toLowerCase()
    );

    if (!targetPack) {
      return;
    }

    this.closeQuiz();
    this.subscribe(targetPack);
  }

  private openPlanChangeModal(mode: 'same-pack' | 'switch-pack', targetPack: Pack): void {
    this.planChangeMode = mode;
    this.pendingPack = targetPack;

    const activePackName = this.activeSubscription?.packName || 'your current pack';
    const remainingText = this.getActiveRemainingText();

    if (mode === 'same-pack') {
      this.planChangeTitle = 'Active Plan Already Enabled';
      this.planChangeMessage = `You already have an active pack (${activePackName})${remainingText}. You cannot buy the same pack again.`;
      this.planChangeConfirmLabel = 'Understood';
      this.showPlanChangeModal = true;
      return;
    }

    this.planChangeTitle = 'Important Plan Change Notice';
    this.planChangeMessage = `You already have an active pack (${activePackName})${remainingText}. If you continue, your current pack will be replaced once your new request is validated.`;
    this.planChangeConfirmLabel = 'Continue';
    this.showPlanChangeModal = true;
  }

  private getActiveRemainingText(): string {
    if (!this.activeSubscription) {
      return '';
    }

    if (!this.activeSubscription.endDate) {
      return ', with no expiration';
    }

    return `, with ${this.activeDaysRemaining} day(s) remaining`;
  }

  private startPurchaseFlow(pack: Pack): void {
    this.selectedDuration = this.getDisplayDuration(pack);
    this.openModal(pack);
  }

  getDisplayPrice(pack: Pack): number {
    if (pack.price != null) {
      return pack.price;
    }
    const option = this.resolveDisplayOption(pack);
    return option?.price ?? 0;
  }

  getDisplayDuration(pack: Pack): Duration {
    if (pack.duration) {
      return pack.duration;
    }
    const option = this.resolveDisplayOption(pack);
    return option?.duration ?? Duration.ONE_MONTH;
  }

  openModal(pack: Pack): void {
    this.selectedPack = pack;
    this.step = 1;
    this.selectedPaymentMethod = PaymentMethod.BANK_TRANSFER;
    this.transactionReference = '';
    this.selectedFile = null;
    this.receiptError = '';
    this.submitError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPack = null;
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
  }

  goToDetails(): void {
    this.step = 2;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
    this.receiptError = '';
  }

  submitSubscription(): void {
    if (!this.selectedPack) return;

    const userId = this.authService.getNumericUserId();
    if (!userId) {
      this.submitError = 'You must be logged in to subscribe.';
      return;
    }

    if (!this.transactionReference.trim()) {
      this.submitError = 'Transaction reference number is required.';
      return;
    }

    if (!this.selectedFile) {
      this.submitError = 'Please upload your payment receipt.';
      return;
    }

    this.submitting = true;
    this.submitError = '';

    const submit = (receiptPath?: string) => {
      const dto: CreateSubscriptionDto = {
        userId,
        packId: this.selectedPack!.id!,
        selectedDuration: this.selectedDuration,
        paymentMethod: this.selectedPaymentMethod,
        transactionReference: this.transactionReference || undefined,
        receiptPath
      };

      this.subscriptionService.subscribe(dto).subscribe({
        next: () => {
          this.submitting = false;
          this.step = 3;
          this.loadActiveSubscription();
        },
        error: (err) => {
          this.submitError = this.resolveSubscriptionSubmitError(err);
          this.submitting = false;
        }
      });
    };

    this.subscriptionService.uploadReceipt(this.selectedFile).subscribe({
      next: (res) => submit(res.receiptPath),
      error: (err) => {
        this.submitError = err?.error?.message || 'Failed to upload receipt.';
        this.submitting = false;
      }
    });
  }

  private resolveSubscriptionSubmitError(err: any): string {
    if (err?.status === 409) {
      return 'You already have a pending request for this pack. Please wait for validation.';
    }

    return err?.error?.message
      || err?.error?.detail
      || err?.error?.error
      || 'Subscription failed. Please try again.';
  }

  private loadActiveSubscription(): void {
    const userId = this.authService.getNumericUserId();
    if (!userId) {
      this.activeSubscription = null;
      this.activeDaysRemaining = 0;
      return;
    }

    this.subscriptionService.getActiveSubscriptionOrNull(userId).subscribe((sub) => {
      if (!sub || sub.statuts !== StatutsSubscription.ACTIVE) {
        this.activeSubscription = null;
        this.activeDaysRemaining = 0;
        return;
      }

      if (sub.endDate && new Date(sub.endDate).getTime() <= Date.now()) {
        this.activeSubscription = null;
        this.activeDaysRemaining = 0;
        return;
      }

      this.activeSubscription = sub;
      this.activeDaysRemaining = this.calculateDaysRemaining(sub.endDate);
    });
  }

  private calculateDaysRemaining(endDate: string | null): number {
    if (!endDate) {
      return 0;
    }
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(Math.ceil(diff / msPerDay), 0);
  }

  private initializeQuizRole(): void {
    const role = (this.authService.getUserRole() || '').toUpperCase();
    if (role === 'CLIENT') {
      this.quizAnswers.role = 'Client';
      this.quizRoleLabel = 'Client';
      return;
    }

    if (role === 'FREELANCER') {
      this.quizAnswers.role = 'Freelancer';
      this.quizRoleLabel = 'Freelancer';
      return;
    }

    this.quizAnswers.role = 'Both';
    this.quizRoleLabel = 'Both';
  }

  private isPackVisibleForCurrentUser(pack: Pack): boolean {
    const role = (this.authService.getUserRole() || '').toUpperCase();
    const userType = (pack.userType || '').toUpperCase() as UserType;

    if (!role) {
      return true;
    }

    if (role === 'CLIENT') {
      return userType === UserType.CLIENT || userType === UserType.FREELANCER_CLIENT;
    }

    if (role === 'FREELANCER') {
      return userType === UserType.FREELANCER || userType === UserType.FREELANCER_CLIENT;
    }

    return true;
  }

  private resolveRecommendedPackByQuiz(visiblePacks: Pack[]): Pack | undefined {
    const sortedByPrice = [...visiblePacks].sort((a, b) => this.getDisplayPrice(a) - this.getDisplayPrice(b));
    const needsScore = this.getQuizNeedsScore();

    if (needsScore <= 2) {
      return sortedByPrice[0];
    }

    if (needsScore <= 6) {
      const midIndex = Math.floor((sortedByPrice.length - 1) / 2);
      return sortedByPrice[midIndex];
    }

    return sortedByPrice[sortedByPrice.length - 1];
  }

  private getQuizNeedsScore(): number {
    let score = 0;

    if (this.quizAnswers.projectsPerMonth === '4-10') score += 2;
    if (this.quizAnswers.projectsPerMonth === '10+') score += 4;

    if (this.quizAnswers.messagingUsage === 'Often') score += 1;
    if (this.quizAnswers.messagingUsage === 'Intensively') score += 2;

    if (this.quizAnswers.visibilityNeed === 'Medium') score += 1;
    if (this.quizAnswers.visibilityNeed === 'High') score += 2;

    if (this.quizAnswers.advancedStats) score += 2;
    if (this.quizNeedsTrainingCertifications) score += 3;

    return score;
  }

  private buildQuizReasons(): string[] {
    const reasons: string[] = [];

    if (this.quizAnswers.projectsPerMonth !== '1-3') {
      reasons.push('Your project volume indicates a plan beyond starter usage.');
    }
    if (this.quizAnswers.messagingUsage === 'Intensively') {
      reasons.push('High communication usage benefits from richer collaboration features.');
    }
    if (this.quizAnswers.visibilityNeed === 'High') {
      reasons.push('You requested stronger profile visibility and exposure.');
    }
    if (this.quizAnswers.advancedStats) {
      reasons.push('You selected advanced analytics requirements.');
    }
    if (this.quizNeedsTrainingCertifications) {
      reasons.push('You requested training and certification access.');
    }

    if (reasons.length === 0) {
      reasons.push('Your current needs fit a simple and cost-effective entry plan.');
    }

    return reasons;
  }

  private computeQuizConfidence(): number {
    const base = 68;
    const boost = Math.min(this.getQuizNeedsScore() * 4, 30);
    return Math.max(60, Math.min(base + boost, 98));
  }
}
