'use client';

import { useState, useEffect } from 'react';
import { Send, Clock } from 'lucide-react';
import { apiFetch } from '../../utils/apifetch';
import { useParams, useNavigate } from 'react-router-dom';

export default function AdminTicketReview() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const [adminReply, setAdminReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ticketDetails, setTicketDetails] = useState({
    firstName: '',
    lastName: '',
    userId: '',
    ticketId: '',
    ticketSubject: '',
    detailedDescription: '',
  });

  useEffect(() => {
    async function fetchAdminSession() {
      try {
        const res = await apiFetch('http://localhost:3000/admin/adminsession', {
          method: 'GET',
          credentials: 'include',
        });
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch admin session');
      } catch (error) {
        console.error('Session fetch error:', error);
        navigate('/login');
      }
    }

    async function getTicketDetails() {
      try {
        const res = await apiFetch(`http://localhost:3000/admin/getticketdetails/${ticketId}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch ticket details');
        const data = await res.json();
        const ticket = data[0];
        setTicketDetails({
          firstName: ticket.firstName,
          lastName: ticket.lastName,
          userId: ticket.fk_support_userId,
          ticketId: ticket.ticket_id,
          ticketSubject: ticket.ticketSubject,
          detailedDescription: ticket.detailedDescription,
        });
      } catch (error) {
        console.error('Ticket fetch error:', error);
      }
    }

    fetchAdminSession();
    getTicketDetails();
  }, [ticketId]);

  async function handleSendReply() {
    if (!adminReply.trim()) return;
    setIsSending(true);
    try {
      const res = await apiFetch(`http://localhost:3000/admin/adminreply/${ticketId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: adminReply }),
      });

      if (!res.ok) throw new Error('Failed to send reply');

      alert('Reply sent successfully!');
      navigate('/admindashboard');
      setAdminReply('');
    } catch (error) {
      console.error('Reply error:', error);
      alert('Failed to send reply. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Ticket Review</h1>
          <p className="text-blue-700">Manage and respond to customer support tickets</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-8">
            <div className="mb-8 pb-8 border-b-2 border-blue-100">
              <h2 className="text-2xl font-bold text-blue-900 mb-6">User Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-600 mb-2">User Name</p>
                  <p className="text-lg text-blue-900">{ticketDetails.firstName} {ticketDetails.lastName}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-600 mb-2">User ID</p>
                  <p className="text-lg text-blue-900">{ticketDetails.userId}</p>
                </div>
              </div>
            </div>

            <div className="mb-8 pb-8 border-b-2 border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-900">Ticket Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm font-semibold text-blue-600 mb-2">Ticket ID</p>
                  <p className="text-lg text-blue-900">{ticketDetails.ticketId}</p>
                </div>
              </div>
            </div>

            <div className="mb-8 pb-8 border-b-2 border-blue-100">
              <h3 className="text-lg font-bold text-blue-900 mb-3">Subject</h3>
              <p className="text-blue-800 text-lg">{ticketDetails.ticketSubject}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-blue-900 mb-3">Detailed Description</h3>
              <div className="bg-blue-50 rounded-lg p-6 text-blue-800 leading-relaxed">
                {ticketDetails.detailedDescription}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-200 p-8">
            <h3 className="text-2xl font-bold text-blue-900 mb-6">Conversation</h3>
            <div className="border-t-2 border-blue-100 pt-6">
              <h4 className="text-lg font-bold text-blue-900 mb-4">Send Reply</h4>
              <div className="flex flex-col gap-4">
                <textarea
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full border-2 border-blue-200 rounded-lg p-4 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder-gray-500 resize-none"
                  rows={5}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendReply}
                    disabled={!adminReply.trim() || isSending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed active:bg-blue-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-semibold"
                  >
                    <Send className="w-5 h-5" />
                    {isSending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}