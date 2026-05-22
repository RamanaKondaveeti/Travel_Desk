import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AddB2CBusDiscount.css';
import { createDiscount, updateDiscount } from '../../../services/adminBusService';

function AddB2CBusDiscount() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingRow = useMemo(() => location.state?.row || null, [location.state]);

  const [formType, setFormType] = useState(editingRow?.type || 'Percentage');
  const [formValue, setFormValue] = useState(editingRow ? String(editingRow.value) : '');
  const [formRemark, setFormRemark] = useState(editingRow?.remark || '');
  const [formStatus, setFormStatus] = useState(editingRow?.status || 'Active');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formValue) {
      setError('Value is required.');
      return;
    }

    const val = Number(formValue);
    if (Number.isNaN(val) || val <= 0) {
      setError('Please enter a valid value greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        value: val,
        discountType: formType,
        remark: formRemark.trim() || (editingRow?.remark || 'B2C Bus Discount'),
        status: formStatus,
        updatedBy: 'admin',
      };

      if (editingRow) {
        await updateDiscount(editingRow.id, payload);
      } else {
        await createDiscount(payload);
      }

      navigate('/admin/b2c-bus/discounts');
    } catch (err) {
      setError(err.message || 'Failed to save discount.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormType(editingRow?.type || 'Percentage');
    setFormValue(editingRow ? String(editingRow.value) : '');
    setFormRemark(editingRow?.remark || '');
    setFormStatus(editingRow?.status || 'Active');
    setError('');
  };

  return (
    <section className="add-discount-page">
      <header className="add-discount-header">
        <div>
          <p className="add-discount-title">{editingRow ? 'Edit B2C Bus Discount' : 'Add B2C Bus Discount'}</p>
          <p className="add-discount-subtitle">Configure discount value and remark details.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={() => navigate('/admin/b2c-bus/discounts')}>
          B2C Bus Discount List
        </button>
      </header>

      <form className="add-discount-form" onSubmit={handleSubmit}>
        <label className="add-field">
          <span>Discount Type</span>
          <select
            value={formType}
            onChange={(event) => setFormType(event.target.value)}
            disabled={submitting}
          >
            <option value="Percentage">Percentage</option>
            <option value="Fixed">Fixed</option>
          </select>
        </label>

        <label className="add-field">
          <span>Value</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={formValue}
            onChange={(event) => setFormValue(event.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="add-field">
          <span>Status</span>
          <select
            value={formStatus}
            onChange={(event) => setFormStatus(event.target.value)}
            disabled={submitting}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <label className="add-field add-field-wide">
          <span>Remark</span>
          <input
            type="text"
            placeholder="Remark"
            value={formRemark}
            onChange={(event) => setFormRemark(event.target.value)}
            disabled={submitting}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? 'Saving...' : 'Submit'}
          </button>
          <button type="button" className="ghost-btn" onClick={handleReset} disabled={submitting}>
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddB2CBusDiscount;
