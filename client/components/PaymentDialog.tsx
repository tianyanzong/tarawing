'use client';
import { useEffect } from 'react';
import type { PaymentMethod } from '@/lib/types';

interface PaymentDialogProps {
  tier: 'detail' | 'deep_insights';
  amountCents: number;
  methods: PaymentMethod[];
  selectedMethodId: string;
  busy: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PaymentDialog({
  tier,
  amountCents,
  methods,
  selectedMethodId,
  busy,
  error,
  onSelect,
  onClose,
  onSkip,
  onComplete,
}: PaymentDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="payment-dialog-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
        <div className="payment-dialog__heading">
          <div>
            <p className="workspace-header__eyebrow">{tier === 'detail' ? 'Detailed report' : 'Deep Insights report'}</p>
            <h2 id="payment-dialog-title">Complete your payment</h2>
          </div>
          <button className="btn btn-ghost btn-compact" onClick={onClose}>Close</button>
        </div>

        <p className="payment-dialog__amount">{fmt(amountCents)}</p>
        <p className="form-note" style={{ marginBottom: 18 }}>
          Scan an enabled QR code, complete the transfer, then submit it for admin verification.
        </p>
        {error && <p className="form-error">{error}</p>}

        {methods.length === 0 ? (
          <div className="payment-empty">
            No payment methods are currently available. {tier === 'detail' ? 'You can still skip payment and view the detailed report.' : 'Please try again later.'}
          </div>
        ) : (
          <div className="payment-method-grid">
            {methods.map((method) => (
              <label
                key={method.id}
                className={`payment-method-option ${selectedMethodId === method.id ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  checked={selectedMethodId === method.id}
                  onChange={() => onSelect(method.id)}
                />
                <span>{method.name}</span>
                <img src={method.qrImage} alt={`${method.name} QR code`} />
              </label>
            ))}
          </div>
        )}

        <div className="payment-dialog__actions">
          {tier === 'detail' && (
            <button className="btn btn-ghost" onClick={onSkip} disabled={busy}>
              Skip payment and view report
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={onComplete}
            disabled={busy || !selectedMethodId || methods.length === 0}
          >
            {busy ? 'Submitting...' : 'Complete payment'}
          </button>
        </div>
      </section>
    </div>
  );
}
