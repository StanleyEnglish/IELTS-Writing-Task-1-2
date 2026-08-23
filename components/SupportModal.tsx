import React, { useState } from 'react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const accountNumber = '19038267165015';
  const displayAccountNumber = '1903 8267 1650 15';
  const bankName = 'Techcombank';
  const accountHolder = 'NGO MINH QUAN';

  // Official VietQR dynamic QR image endpoint (using compact template without amount field)
  const qrCodeUrl = `https://img.vietqr.io/image/970407-${accountNumber}-compact.png?accountName=${encodeURIComponent(accountHolder)}&addInfo=${encodeURIComponent('Ung ho IELTS Instructor')}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <div>
              <h3 className="font-bold text-lg leading-tight">Ủng Hộ Tác Giả</h3>
              <p className="text-xs text-amber-100">Support IELTS Instructor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
            title="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Friendly Note */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed text-center">
            Cảm ơn bạn đã đồng hành cùng <b>IELTS Instructor</b>! Mọi sự ủng hộ của bạn là nguồn động lực to lớn giúp mình duy trì và nâng cấp thêm nhiều tính năng mới hữu ích.
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-amber-50/40 p-4 rounded-xl border border-slate-200 shadow-inner">
            <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 inline-block mb-2">
              <img
                src={qrCodeUrl}
                alt="Techcombank VietQR NGO MINH QUAN"
                className="w-56 h-auto object-contain rounded-lg"
                loading="eager"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center font-medium">
              Mở app ngân hàng bất kỳ để quét mã <b>VietQR</b> chuyển khoản tức thì
            </p>
          </div>

          {/* Account Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Ngân hàng</span>
              <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                {bankName}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Chủ tài khoản</span>
              <span className="font-bold text-slate-900 uppercase">
                {accountHolder}
              </span>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <div>
                <span className="text-slate-500 block font-medium">Số tài khoản</span>
                <span className="font-mono font-bold text-slate-900 text-sm tracking-wider">
                  {displayAccountNumber}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-red-700 hover:bg-red-800 text-white shadow-red-200 active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Đã chép!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Sao chép STK
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Close Action */}
          <div className="pt-1 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
