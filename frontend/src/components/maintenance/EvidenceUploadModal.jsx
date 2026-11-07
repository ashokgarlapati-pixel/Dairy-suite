import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  CheckCircle,
  AlertCircle,
  Mic,
  MapPin,
  UploadCloud,
  FileCheck2,
  Plus
} from 'lucide-react';
import workOrderApi from '../../api/workOrderApi';

export const EvidenceUploadModal = ({ isOpen, onClose, onEvidenceSubmitted, workOrder }) => {
  const [summaryOfWork, setSummaryOfWork] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [checklist, setChecklist] = useState([
    { item: 'Compressor suction valve torque verified (180 Nm)', result: 'PASS', notes: '' },
    { item: 'Refrigerant line vacuum held at < 500 microns', result: 'PASS', notes: '' },
    { item: 'Cold chain chilling pull-down tested below 4.0°C', result: 'PASS', notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-acquire GPS coordinates
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      setIsGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: parseFloat(pos.coords.latitude.toFixed(4)),
            lng: parseFloat(pos.coords.longitude.toFixed(4))
          });
          setIsGettingGps(false);
        },
        () => {
          // Default to Mysore Dairy coordinates if permission denied
          setGpsLocation({ lat: 12.3051, lng: 76.6551 });
          setIsGettingGps(false);
        }
      );
    }
  }, [isOpen]);

  if (!isOpen || !workOrder) return null;

  const handleAddPhoto = () => {
    if (photoUrlInput.trim()) {
      setPhotos((prev) => [...prev, photoUrlInput.trim()]);
      setPhotoUrlInput('');
    }
  };

  const handleToggleChecklist = (index, result) => {
    const updated = [...checklist];
    updated[index].result = result;
    setChecklist(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!summaryOfWork.trim()) {
      setErrorMessage('Please provide a summary of the repair and maintenance work performed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      summaryOfWork: summaryOfWork.trim(),
      photos:
        photos.length > 0
          ? photos
          : [
              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'
            ],
      audioNotesUrl: 'https://storage.dairycoop.org/audio/notes-2026-0819.m4a',
      gpsCoordinates: gpsLocation,
      checklistResults: checklist
    };

    try {
      const res = await workOrderApi.uploadEvidence(workOrder._id, payload);
      onEvidenceSubmitted(res.data);
      onClose();
    } catch (err) {
      console.error('Evidence submit failed:', err);
      setErrorMessage(err.message || 'Failed to submit evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Mobile Technician Evidence Submission</h2>
              <p className="text-xs text-slate-300">
                Work Order: <span className="font-mono text-emerald-400">{workOrder.workOrderNumber}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* GPS Coordinates Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Field Geolocation Stamp:</span>
            </div>
            <span className="font-mono text-slate-600 font-bold">
              {isGettingGps
                ? 'Acquiring GPS...'
                : gpsLocation
                ? `${gpsLocation.lat}°N, ${gpsLocation.lng}°E`
                : '12.3051°N, 76.6551°E'}
            </span>
          </div>

          {/* Work Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Summary of Work & Diagnostics Performed <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={summaryOfWork}
              onChange={(e) => setSummaryOfWork(e.target.value)}
              placeholder="Describe actions taken: parts replaced, vacuum levels, refrigerant charge, sanitary seals tested..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Verification Checklist */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Quality & Safety Inspection Checklist
            </label>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800">{item.item}</span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(idx, 'PASS')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                        item.result === 'PASS'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      PASS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleChecklist(idx, 'FAIL')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                        item.result === 'FAIL'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      FAIL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photos Proof */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Photo Evidence & Equipment Visuals
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste photo URL or inspection image link..."
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
              >
                Add Photo
              </button>
            </div>

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {photos.map((url, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-mono"
                  >
                    <span>Photo #{i + 1} attached</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Uploading Evidence...' : 'Submit for Supervisor Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvidenceUploadModal;

