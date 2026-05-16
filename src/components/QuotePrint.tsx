import React from 'react';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

interface QuotePrintProps {
  tenant: any;
  quote: any;
  items: any[];
  type: 'A4' | 'Thermal';
}

export const QuotePrint: React.FC<QuotePrintProps> = ({ tenant, quote, items, type }) => {
  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (type === 'Thermal') {
    return (
      <div className="w-[80mm] p-4 bg-white text-black font-mono text-[12px] leading-tight">
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          <h1 className="font-bold text-base uppercase">{tenant.name}</h1>
          <p>{tenant.document}</p>
          <p>{tenant.phone}</p>
        </div>

        <div className="text-center font-bold mb-2">
          ORÇAMENTO #{quote.quote_number}
        </div>

        <div className="mb-2 text-[11px]">
          <p>Data: {new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
          <p>Cliente: {quote.display_name || 'Consumidor'}</p>
          {quote.guest_phone && <p>Tel: {quote.guest_phone}</p>}
        </div>

        <table className="w-full text-left mb-2 text-[11px]">
          <thead className="border-b border-dashed border-black">
            <tr>
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qtd</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-dashed border-zinc-100">
                <td className="py-1">{it.description || it.product_name}</td>
                <td className="py-1 text-center">{Number(it.quantity)}</td>
                <td className="py-1 text-right">{fmtCurrency(Number(it.total_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-2 space-y-1 text-right">
          <p>Subtotal: {fmtCurrency(Number(quote.subtotal))}</p>
          {Number(quote.discount) > 0 && <p>Desconto: -{fmtCurrency(Number(quote.discount))}</p>}
          <p className="font-bold text-sm">TOTAL: {fmtCurrency(Number(quote.total))}</p>
        </div>

        <div className="mt-4 text-center text-[10px] italic border-t border-dashed border-black pt-2">
          <p>Válido por {quote.validity_days} dias.</p>
          <p>Este documento não é um cupom fiscal.</p>
        </div>
      </div>
    );
  }

  // A4 Template
  return (
    <div className="w-[210mm] min-h-[297mm] p-12 bg-white text-zinc-900 font-sans shadow-lg mx-auto print:shadow-none print:m-0">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-emerald-600 mb-2 uppercase">{tenant.name}</h1>
          <div className="text-sm text-zinc-500 space-y-1">
            <p className="flex items-center gap-2"><MapPin size={14} /> {tenant.address?.street}, {tenant.address?.number} - {tenant.address?.city}/{tenant.address?.state}</p>
            <p className="flex items-center gap-2"><Phone size={14} /> {tenant.phone}</p>
            {tenant.email && <p className="flex items-center gap-2"><Mail size={14} /> {tenant.email}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-zinc-800 uppercase tracking-tighter">Orçamento</h2>
          <p className="text-4xl font-black text-zinc-300 mt-1">#{String(quote.quote_number).padStart(5, '0')}</p>
          <p className="text-xs font-bold text-zinc-400 mt-2">EMITIDO EM: {new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Dados do Cliente</h3>
          <p className="text-lg font-bold text-zinc-900">{quote.display_name || 'NÃO INFORMADO'}</p>
          <div className="text-sm text-zinc-500 mt-2 space-y-1">
            {quote.guest_document && <p>CPF/CNPJ: {quote.guest_document}</p>}
            {quote.guest_phone && <p>Telefone: {quote.guest_phone}</p>}
            {quote.guest_address && <p>Endereço: {quote.guest_address}</p>}
          </div>
        </div>
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Informações do Orçamento</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Validade:</p>
              <p className="font-bold text-zinc-700">{quote.validity_days} dias</p>
            </div>
            <div>
              <p className="text-zinc-400">Vendedor:</p>
              <p className="font-bold text-zinc-700">{quote.user_name || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-400">Status:</p>
              <p className="font-bold text-emerald-600 uppercase">{quote.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-zinc-100">
              <th className="py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2">Descrição</th>
              <th className="py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center w-24">Qtd</th>
              <th className="py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right w-32">V. Unit.</th>
              <th className="py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="py-4 px-2">
                  <p className="font-bold text-zinc-800">{it.description || it.product_name}</p>
                  {it.sku && <p className="text-[10px] text-zinc-400 font-mono">{it.sku}</p>}
                </td>
                <td className="py-4 text-center text-zinc-600">{Number(it.quantity)}</td>
                <td className="py-4 text-right text-zinc-600">{fmtCurrency(Number(it.unit_price))}</td>
                <td className="py-4 text-right font-bold text-zinc-900">{fmtCurrency(Number(it.total_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes */}
      <div className="grid grid-cols-2 gap-12 pt-8 border-t-2 border-zinc-100">
        <div>
          {quote.notes && (
            <>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Observações</h3>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
            </>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>Subtotal:</span>
            <span>{fmtCurrency(Number(quote.subtotal))}</span>
          </div>
          {Number(quote.discount) > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Desconto:</span>
              <span>-{fmtCurrency(Number(quote.discount))}</span>
            </div>
          )}
          {Number(quote.shipping) > 0 && (
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Frete:</span>
              <span>{fmtCurrency(Number(quote.shipping))}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
            <span className="text-lg font-bold text-zinc-900">Total do Orçamento:</span>
            <span className="text-3xl font-black text-emerald-600">{fmtCurrency(Number(quote.total))}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-24 text-center border-t border-zinc-100 pt-8">
        <p className="text-xs text-zinc-400 uppercase font-bold tracking-[0.2em] mb-4">Nexus ERP - Soluções Inteligentes para seu Negócio</p>
        <div className="flex justify-center gap-6 text-zinc-300">
          <Globe size={18} />
          <Mail size={18} />
          <Phone size={18} />
        </div>
      </div>
    </div>
  );
};
