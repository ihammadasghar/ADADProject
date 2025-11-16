import React, { useState, useEffect } from "react";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

export default function EditEventModal({ show, event, onClose, onSaved }) {
  const [form, setForm] = useState({
    establishmentName: "",
    address: "",
    zipCode: "",
    county: "",
    changeDate: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) {
      setForm({
        establishmentName: event.establishmentName || "",
        address: event.address || "",
        zipCode: event.zipCode || "",
        county: event.county || "",
        changeDate: event.changeDate || ""
      });
      setError("");
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const handleSave = async () => {
    if (!event || !event._id) return;
    setSaving(true);
    setError("");
    try {
      // Only send fields present in the form (EventUpdate)
      const payload = {
        establishmentName: form.establishmentName,
        address: form.address,
        zipCode: form.zipCode,
        county: form.county,
        changeDate: form.changeDate
      };

      const res = await fetch(`http://localhost:3000/events/${event._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      onSaved && onSaved(updated);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Event</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-2">
            <Form.Label>Establishment Name</Form.Label>
            <Form.Control name="establishmentName" value={form.establishmentName} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Address</Form.Label>
            <Form.Control name="address" value={form.address} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Zip Code</Form.Label>
            <Form.Control name="zipCode" value={form.zipCode} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>County</Form.Label>
            <Form.Control name="county" value={form.county} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Change Date (ISO)</Form.Label>
            <Form.Control name="changeDate" value={form.changeDate} onChange={handleChange} />
            <Form.Text className="text-muted">Use ISO date-time string (e.g. 2025-11-16T12:00:00Z) or leave blank.</Form.Text>
          </Form.Group>

          {error && <div className="text-danger">{error}</div>}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}