import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BankPaymentFormComponent } from './bank-payment-form.component';

describe('BankPaymentFormComponent', () => {
  let component: BankPaymentFormComponent;
  let fixture: ComponentFixture<BankPaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BankPaymentFormComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(BankPaymentFormComponent);
    component = fixture.componentInstance;
    component.plan = {
      id: '1',
      name: 'Basic',
      price: 29,
      billingPeriod: 'Monthly'
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default payment method as bank-transfer', () => {
    expect(component.paymentMethod).toBe('bank-transfer');
  });

  it('should emit cancel event', () => {
    spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('should handle file selection', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const event = {
      target: {
        files: [file]
      }
    } as any;

    component.handleFileSelect(event);
    expect(component.uploadedFile).toBe(file);
  });

  it('should remove uploaded file', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    component.uploadedFile = file;
    component.handleRemoveFile();
    expect(component.uploadedFile).toBeNull();
  });
});
