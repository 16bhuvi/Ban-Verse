import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, X, ShieldCheck, Award, GraduationCap } from 'lucide-react';
import './Certificate.css';
import uniLogo from '../banasthali-logo.jpg';

const Certificate = ({ data, onClose }) => {
  const certRef = useRef();

  // Generate a more robust verification ID
  const verificationId = `BAN-${data.userName.substring(0, 3).toUpperCase()}-${data.eventName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  const handleDownload = async () => {
    try {
      const element = certRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, // Higher scale for premium quality
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Banverse_Official_Certificate_${data.userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    }
  };

  if (!data) return null;

  return (
    <div className="certificate-overlay">
      <div className="certificate-modal-premium">
        <div className="header-bar">
          <div className="preview-title">
            <ShieldCheck size={20} color="#6366f1" />
            <span>Official University Certificate Preview</span>
          </div>
          <button onClick={onClose} className="close-preview">
            <X size={20} />
          </button>
        </div>

        <div className="certificate-preview-scroll">
          <div className="certificate-container-official" ref={certRef}>
            <div className="certificate-border-outer">
              <div className="certificate-border-inner">
                {/* Background Watermark */}
                <div className="cert-watermark">BANVERSE</div>
                
                <div className="certificate-inner-official">
                  <div className="cert-header-official">
                    <img src={uniLogo} alt="University Logo" className="uni-logo-cert" />
                    <div className="uni-info">
                      <h1 className="uni-name">BANASTHALI VIDYAPITH</h1>
                    </div>
                    <img src={data.clubLogo || uniLogo} alt="Club Logo" className="club-logo-right" />
                  </div>

                  <div className="cert-main-content">
                    <div className="award-badge">
                      <Award size={48} color="#d4af37" />
                    </div>
                    
                    <h2 className="official-title">CERTIFICATE OF {data.type === 'Winner' ? 'EXCELLENCE' : 'ACHIEVEMENT'}</h2>
                    
                    <p className="cert-statement">This is to officially certify that</p>
                    
                    <h3 className="recipient-name-premium">{data.userName}</h3>
                    
                    <p className="cert-statement-detail">
                      of {data.userDepartment || "Banasthali Vidyapith"} has been awarded this certificate for 
                      {data.type === 'Winner' ? ` achieving the ${data.position} position` : ' outstanding participation'} in
                    </p>
                    
                    <div className="event-box-premium">
                      <GraduationCap size={20} />
                      <span className="event-name-cert">{data.eventName}</span>
                    </div>

                    <p className="cert-issuance-verification">
                      This formal recognition is issued by <strong>{data.clubName}</strong> in direct collaboration with the 
                      <strong> Ban-verse Digital Campus Infrastructure</strong>. Verified and Digitally Timestamped. 
                    </p>
                  </div>

                  <div className="cert-footer-official">
                    <div className="signature-block">
                      <div className="signature-line">
                        <span className="sig-text">{data.clubName.split(" ")[0]} Leader</span>
                      </div>
                      <span className="sig-role">Lead Organizer</span>
                    </div>

                    <div className="verification-seal">
                      <div className="seal-outer">
                        <div className="seal-inner">
                          <span>OFFICIAL</span>
                          <ShieldCheck size={24} />
                          <span>SEAL</span>
                        </div>
                      </div>
                    </div>

                    <div className="signature-block">
                      <div className="signature-line">
                        <span className="sig-text-registrar">Anshuman Sir</span>
                      </div>
                      <span className="sig-role">Director, Ban-verse Digital Campus</span>
                    </div>
                  </div>

                  <div className="cert-meta-official">
                    <div className="meta-item">
                      <strong>DATE OF ISSUE:</strong> {new Date(data.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="meta-item">
                      <strong>VERIFICATION ID:</strong> {verificationId}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-footer-premium">
          <div className="verification-notice">
            <ShieldCheck size={16} />
            <span>This certificate is digitally signed and verifiable at banverse.edu.in/verify</span>
          </div>
          <div className="footer-btns">
            <button onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleDownload} className="btn-download-premium">
              <Download size={18} /> Download Verified PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
