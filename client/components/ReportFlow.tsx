'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadFile, ApiError } from '@/lib/api';
import { useUserAuth } from '@/lib/auth';
import type { PaymentMethod, ReadingView } from '@/lib/types';
import PaymentDialog from '@/components/PaymentDialog';

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface PaymentSession {
  tier: 'detail' | 'deep_insights';
  amountCents: number;
  orderId: string;
}

export default function ReportFlow({ readingId }: { readingId: string }) {
  const [view, setView] = useState<ReadingView | null>(null);
  const { status } = useUserAuth();
  const [anonSimpleReport, setAnonSimpleReport] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const nextView = await api.get<ReadingView>(`/api/readings/${readingId}`);
      setView(nextView);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this reading.');
    }
  }

  useEffect(() => {
    refresh();
  }, [readingId]);

  async function generateSimpleReport() {
    setBusy('simple'); setError(null);
    try {
      const res = await api.post<{ simpleReport: string; saved: boolean }>(`/api/readings/${readingId}/simple-report`);
      if (res.saved) await refresh();
      else setAnonSimpleReport(res.simpleReport);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the report.');
    } finally {
      setBusy(null);
    }
  }

  async function openPayment(tier: 'detail' | 'deep_insights') {
    if (!view) return;
    setBusy('open-payment'); setError(null);
    try {
      const methods = await api.get<PaymentMethod[]>('/api/payment-methods');
      setPaymentMethods(methods);
      setSelectedMethodId(methods[0]?.id || '');

      const existingOrderId = tier === 'detail'
        ? view.detailPayment.orderId
        : view.deepInsights.orderId;
      let orderId = existingOrderId;
      let amountCents = tier === 'detail'
        ? (view.detailPayment.amountCents || view.pricing?.detailCents || 0)
        : (view.pricing?.deepInsightsCents || 0);

      if (!orderId) {
        const order = await api.post<{ id: string; amountCents: number }>('/api/orders', {
          readingId,
          tier,
        });
        orderId = order.id;
        amountCents = order.amountCents;
      }

      if (!orderId) throw new Error('Could not create an order for this report.');
      setPaymentSession({ tier, amountCents, orderId });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open the payment dialog.');
    } finally {
      setBusy(null);
    }
  }

  async function skipDetailPayment() {
    setBusy('skip'); setError(null);
    try {
      await api.post(`/api/readings/${readingId}/detail/skip-payment`);
      setPaymentSession(null);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open the detailed report.');
    } finally {
      setBusy(null);
    }
  }

  async function completePayment() {
    if (!paymentSession || !selectedMethodId) return;
    setBusy('complete-payment'); setError(null);
    try {
      await api.post(`/api/orders/${paymentSession.orderId}/submit-payment`, {
        paymentMethodId: selectedMethodId,
      });
      setPaymentSession(null);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit the payment.');
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy('pdf'); setError(null);
    try {
      await downloadFile(`/api/readings/${readingId}/export-pdf`, 'tarawing-detailed-report.pdf');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not export the PDF.');
    } finally {
      setBusy(null);
    }
  }

  if (!view) {
    return error ? <p className="form-error" style={{ marginTop: 20 }}>{error}</p> : null;
  }

  const simpleReportText = view.simpleReport || anonSimpleReport;
  const detailedPaid = !!view.detailedPaid;
  const detailOrderStatus = view.detailPayment?.orderStatus;
  const deepOrderStatus = view.deepInsights.orderStatus;
  const deepSubmitted = !!view.deepInsights.submitted || deepOrderStatus === 'deep_insights_tobepaid';

  return (
    <div style={{ marginTop: 28 }}>
      {error && <p className="form-error">{error}</p>}

      {!simpleReportText && (
        <button className="btn btn-primary" onClick={generateSimpleReport} disabled={busy === 'simple'}>
          {busy === 'simple' ? 'Generating...' : 'Generate report'}
        </button>
      )}

      {simpleReportText && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3 className="heading-tarot" style={{ fontSize: 17, marginBottom: 10 }}>Simple Report</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{simpleReportText}</p>
        </div>
      )}

      {simpleReportText && (status === 'anonymous' || status === 'error') && (
        <div className="panel">
          <p className="form-note">
            <Link href="/login" style={{ color: 'var(--gold-bright)' }}>Sign in</Link> to save this report to your
            dashboard{view.pricing ? `, unlock the detailed report (${fmt(view.pricing.detailCents)}), and order a Deep Insights report (${fmt(view.pricing.deepInsightsCents)})` : ' and unlock deeper reports'}.
          </p>
        </div>
      )}

      {simpleReportText && status === 'authenticated' && view.pricing && (
        <div className="report-actions">
          {!view.detailedUnlocked && (
            <button className="btn btn-primary" onClick={() => openPayment('detail')} disabled={busy === 'open-payment'}>
              View Detailed Report ({fmt(view.pricing.detailCents)})
            </button>
          )}
          {view.detailedUnlocked && !detailedPaid && detailOrderStatus !== 'detail_tobepaid' && (
            <button className="btn btn-primary" onClick={() => openPayment('detail')} disabled={busy === 'open-payment'}>
              Pay detailed report ({fmt(view.pricing.detailCents)})
            </button>
          )}
          {detailOrderStatus === 'detail_tobepaid' && (
            <span className="report-status-note">Payment submitted. Deep Insights unlocks after admin verification.</span>
          )}
        </div>
      )}

      {view.detailedUnlocked && view.detailedReport && (
        <div className="panel" style={{ marginTop: 20, marginBottom: 20 }}>
          <div className="report-section-heading">
            <h3 className="heading-tarot" style={{ fontSize: 17 }}>Detailed Report</h3>
            <button className="btn btn-ghost btn-compact" onClick={exportPdf} disabled={busy === 'pdf'}>
              {busy === 'pdf' ? 'Exporting...' : 'Export as PDF'}
            </button>
          </div>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{view.detailedReport}</p>
        </div>
      )}

      {view.detailedUnlocked && (
        <div className="deep-insights-flow">
          {view.deepInsights.ready && view.deepInsights.report && (
            <div className="panel" style={{ borderColor: 'var(--gold)' }}>
              <h3 className="heading-tarot" style={{ fontSize: 17, marginBottom: 10, color: 'var(--gold-bright)' }}>Deep Insights Report</h3>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{view.deepInsights.report}</p>
            </div>
          )}

          {view.deepInsights.pending && (
            <div className="panel">
              <p className="form-note" style={{ marginBottom: 10 }}>
                Your Deep Insights payment has been verified and the report is being prepared. Check back soon.
              </p>
              <button className="btn btn-ghost" onClick={refresh}>Check again</button>
            </div>
          )}

          {deepSubmitted && (
            <div className="panel">
              <p className="form-note">
                Deep Insights payment submitted. The report will be generated only after an admin verifies the payment.
              </p>
            </div>
          )}

          {!view.deepInsights.paid && !deepSubmitted && view.pricing && (
            <button
              className="btn btn-primary"
              onClick={() => openPayment('deep_insights')}
              disabled={!detailedPaid || busy === 'open-payment'}
            >
              {view.deepInsights.ordered
                ? `Complete Deep Insights payment (${fmt(view.pricing.deepInsightsCents)})`
                : `Get Deep Insights Report (${fmt(view.pricing.deepInsightsCents)})`}
            </button>
          )}

          {!detailedPaid && (
            <p className="form-note" style={{ marginTop: 10 }}>
              Deep Insights is enabled only after the detailed-report payment has been verified.
            </p>
          )}
        </div>
      )}

      {paymentSession && (
        <PaymentDialog
          tier={paymentSession.tier}
          amountCents={paymentSession.amountCents}
          methods={paymentMethods}
          selectedMethodId={selectedMethodId}
          busy={busy === 'skip' || busy === 'complete-payment'}
          error={error}
          onSelect={setSelectedMethodId}
          onClose={() => setPaymentSession(null)}
          onSkip={skipDetailPayment}
          onComplete={completePayment}
        />
      )}
    </div>
  );
}
