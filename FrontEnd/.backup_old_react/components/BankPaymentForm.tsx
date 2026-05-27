import { useState, useRef } from 'react';
import {
  Building,
  Upload,
  FileText,
  CheckCircle,
  X,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
}

interface BankPaymentFormProps {
  plan: Plan;
  paymentMethod: 'bank-transfer' | 'cash-deposit';
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BankPaymentForm({
  plan,
  paymentMethod,
  onSuccess,
  onCancel,
}: BankPaymentFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock bank details
  const bankDetails = {
    bankName: 'FreelanceMatch Bank',
    accountName: 'FreelanceMatch Ltd',
    accountNumber: '1234567890',
    routingNumber: '987654321',
    swiftCode: 'FMLBANKUS',
    iban: 'US12 3456 7890 1234 5678 90',
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid file (JPG, PNG, or PDF)');
        return;
      }

      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
      }

      setUploadedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedFile) {
      alert('Please upload a payment receipt');
      return;
    }

    if (!fullName || !email || !transactionRef) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    // Simulate upload process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setUploading(false);
    setSubmitted(true);

    // Redirect after showing success message
    setTimeout(() => {
      onSuccess();
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center size-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="size-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Receipt Uploaded Successfully!</h3>
        <p className="text-slate-600 mb-4">
          Your payment is pending verification by our admin team.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700">
          <p className="font-medium mb-2">What happens next?</p>
          <ul className="text-left space-y-1 text-slate-600">
            <li>• Our team will verify your payment within 24-48 hours</li>
            <li>• You'll receive an email confirmation once verified</li>
            <li>• Your subscription will be activated immediately after verification</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${
            paymentMethod === 'bank-transfer' ? 'bg-green-600' : 'bg-purple-600'
          }`}>
            {paymentMethod === 'bank-transfer' ? (
              <Building className="size-5 text-white" />
            ) : (
              <Upload className="size-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {paymentMethod === 'bank-transfer' ? 'Bank Transfer Payment' : 'Cash Deposit Payment'}
            </h3>
            <p className="text-sm text-slate-600">
              {paymentMethod === 'bank-transfer'
                ? 'Transfer funds to our bank account'
                : 'Deposit cash and upload receipt'}
            </p>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-600">{plan.name} Plan</span>
            <span className="font-semibold text-slate-900">${plan.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Billing Period</span>
            <span className="text-slate-900">{plan.billingPeriod}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-900">Total Amount</span>
              <span className="text-2xl font-bold text-green-600">${plan.price}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Building className="size-5 text-green-600" />
          Bank Account Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">Bank Name</div>
              <div className="font-medium text-slate-900">{bankDetails.bankName}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.bankName, 'bankName')}
              className="text-blue-600 hover:text-blue-700"
            >
              {copiedField === 'bankName' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">Account Name</div>
              <div className="font-medium text-slate-900">{bankDetails.accountName}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.accountName, 'accountName')}
              className="text-blue-600 hover:text-blue-700"
            >
              {copiedField === 'accountName' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">Account Number</div>
              <div className="font-medium text-slate-900">{bankDetails.accountNumber}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.accountNumber, 'accountNumber')}
              className="text-blue-600 hover:text-blue-700"
            >
              {copiedField === 'accountNumber' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">Routing Number</div>
              <div className="font-medium text-slate-900">{bankDetails.routingNumber}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.routingNumber, 'routingNumber')}
              className="text-blue-600 hover:text-blue-700"
            >
              {copiedField === 'routingNumber' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="text-xs text-slate-500">SWIFT Code</div>
              <div className="font-medium text-slate-900">{bankDetails.swiftCode}</div>
            </div>
            <button
              onClick={() => handleCopy(bankDetails.swiftCode, 'swiftCode')}
              className="text-blue-600 hover:text-blue-700"
            >
              {copiedField === 'swiftCode' ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <p className="font-medium mb-1">Important Instructions:</p>
            <ul className="space-y-1 text-slate-600">
              <li>
                • Make sure to include the exact amount: <strong>${plan.price}</strong>
              </li>
              <li>
                • {paymentMethod === 'bank-transfer'
                  ? 'Complete the bank transfer using the details above'
                  : 'Deposit the cash amount at any of our partner bank branches'}
              </li>
              <li>• Keep your receipt/confirmation as proof of payment</li>
              <li>• Upload a clear photo or scan of your receipt below</li>
              <li>• Our team will verify your payment within 24-48 hours</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Transaction Reference */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Transaction Reference Number *
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="Enter the reference number from your receipt"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload Receipt *
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-green-500 transition-colors">
            {uploadedFile ? (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-8 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-slate-900">{uploadedFile.name}</div>
                    <div className="text-sm text-slate-600">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="size-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="size-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 mb-2">
                  Click to upload or drag and drop your receipt
                </p>
                <p className="text-sm text-slate-500">PNG, JPG, or PDF (max. 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  required
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Submit for Verification</>
            )}
          </button>
        </div>

        {/* Info Text */}
        <div className="text-center text-xs text-slate-500">
          <p>By submitting this receipt, you confirm that the payment has been made.</p>
          <p className="mt-1">False submissions may result in account suspension.</p>
        </div>
      </form>
    </div>
  );
}
