import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ListItemModal from './components/ListItemModal';
import AuthModal from './components/AuthModal';

// Pages
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import EquipmentDetailsPage from './pages/EquipmentDetailsPage';
import BookingFlowPage from './pages/BookingFlowPage';
import AIAssistantPage from './pages/AIAssistantPage';
import BorrowerDashboardPage from './pages/BorrowerDashboardPage';
import LenderDashboardPage from './pages/LenderDashboardPage';
import CommunityMessagingPage from './pages/CommunityMessagingPage';

export default function App() {
  const [isListItemModalOpen, setIsListItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenListItemModal = (item = null) => {
    setItemToEdit(item);
    setIsListItemModalOpen(true);
  };

  const handleCloseListItemModal = () => {
    setItemToEdit(null);
    setIsListItemModalOpen(false);
  };

  const handleAddItem = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#FAFBF8] text-[#151E18]">
          
          {/* Navigation Bar */}
          <Navbar
            onOpenListItemModal={() => handleOpenListItemModal(null)}
            onOpenAuthModal={handleOpenAuthModal}
          />

          {/* Dynamic Route View */}
          <div className="flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    onOpenListItemModal={() => handleOpenListItemModal(null)}
                    onOpenAuthModal={handleOpenAuthModal}
                    refreshTrigger={refreshTrigger}
                  />
                }
              />
              <Route
                path="/explore"
                element={
                  <ExplorePage
                    onOpenListItemModal={() => handleOpenListItemModal(null)}
                    refreshTrigger={refreshTrigger}
                  />
                }
              />
              <Route
                path="/equipment/:id"
                element={
                  <EquipmentDetailsPage
                    onOpenAuthModal={handleOpenAuthModal}
                    onOpenListItemModal={handleOpenListItemModal}
                    refreshTrigger={refreshTrigger}
                  />
                }
              />
              <Route
                path="/booking/:id"
                element={<BookingFlowPage onOpenAuthModal={handleOpenAuthModal} />}
              />
              <Route
                path="/ai-planner"
                element={
                  <AIAssistantPage
                    onOpenListItemModal={() => handleOpenListItemModal(null)}
                  />
                }
              />
              <Route
                path="/ai-assistant"
                element={<Navigate to="/ai-planner" replace />}
              />
              <Route
                path="/borrower-dashboard"
                element={<BorrowerDashboardPage onOpenAuthModal={handleOpenAuthModal} />}
              />
              <Route
                path="/lender-dashboard"
                element={
                  <LenderDashboardPage
                    onOpenListItemModal={handleOpenListItemModal}
                    onOpenAuthModal={handleOpenAuthModal}
                    refreshTrigger={refreshTrigger}
                  />
                }
              />
              <Route
                path="/messages"
                element={<CommunityMessagingPage onOpenAuthModal={handleOpenAuthModal} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Global Footer */}
          <Footer />

          {/* List Item Modal */}
          <ListItemModal
            key={itemToEdit ? (itemToEdit._id || itemToEdit.id) : (isListItemModalOpen ? 'open' : 'closed')}
            isOpen={isListItemModalOpen}
            onClose={handleCloseListItemModal}
            onAddItem={handleAddItem}
            onOpenAuthModal={handleOpenAuthModal}
            itemToEdit={itemToEdit}
          />

          {/* Authentication Modal */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          />

        </div>
      </Router>
    </AuthProvider>
  );
}
