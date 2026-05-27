import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StripePaymentFormComponent } from './stripe-payment-form.component';

describe('StripePaymentFormComponent', () => {
  let component: StripePaymentFormComponent;
  let fixture: ComponentFixture<StripePaymentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StripePaymentFormComponent],
      imports: [FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StripePaymentFormComponent);
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

  it('should emit cancel event', () => {
    spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(component.cancel.emit).toHaveBeenCalled();
  });

  it('should show error when fields are empty', async () => {
    component.cardholderName = '';
    component.email = '';
    await component.handleSubmit();
    expect(component.error).toBe('Please fill in all required fields');
  });

  it('should format card number', () => {
    const event = {
      target: { value: '4242424242424242' }
    } as any;
    component.formatCardNumber(event);
    expect(component.cardNumber).toBe('4242 4242 4242 4242');
  });
});
