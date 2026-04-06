

import './App.css'
import RegistrationPage from './pages/registerpage'
import LoginPage from './pages/loginpage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/homepage';
import  UserDashboard from './pages/user/userdashboard';
import BoatOperatorDashboard from './pages/boatoperator/boatoperatordashboard';
import AddBoat from './pages/boatoperator/addboat';
import BookBoat from './pages/user/bookboat';
import  CurrentBookings from './pages/user/currentbookings';
import EditBoat from './pages/boatoperator/editboat';
import EditTicketPrice from './pages/boatoperator/editticketprice';
import WeatherAnalytics from './pages/weatheranalytics'
import AdminDashboard from './pages/admin/admindashboard';
import ManageBoatOperatorsPage from './pages/admin/manageboatoperators';
import ManageBoatsPage from './pages/admin/manageboats';
import UserEditPage from './pages/user/edituser';
import BoatOperatorEditPage from './pages/boatoperator/editboatoperator';
import AdminTicketReview from './pages/admin/ticketreview';
import OnlinePaymentPage from './pages/user/onlinepayment';
import ManageRefundsPage from './pages/boatoperator/manageuserrefunds';
import ViewTicketPage from './pages/user/viewticketdetails';
import  RefundDetailsPage from './pages/user/viewrefunddetails';


function App() {
  

  return (
    <>
    <BrowserRouter>
    <Routes>
    <Route path='/' element={< HomePage />} />
    <Route path='/register' element={<RegistrationPage />} />
    <Route path='/login' element={<LoginPage />} />
    // userd routes
    <Route path='/userdashboard' element={<UserDashboard />} />
    <Route path='/bookboat/:boatID' element={<BookBoat />} />
    <Route path='/edituser/:userId' element={<UserEditPage />} />
    <Route path='/viewticket/:ticketId' element={<ViewTicketPage />} />
    <Route path='/viewrefund/:refundId' element={<RefundDetailsPage />} />

    //Boat opearator routes
    <Route path='/boatoperatordashboard' element={<BoatOperatorDashboard />} />
    <Route path='/addboat' element={<AddBoat />} />
    <Route path='/currentbookings/:bookingId' element={<CurrentBookings />} />
    <Route path='/editboat/:boatID' element={<EditBoat />} />
    <Route path='/editticketprice/:boatID' element={<EditTicketPrice />} />
      <Route path='/weatheranalytics' element={<WeatherAnalytics />} />
      <Route path='/editboatoperator/:boatoperatorId' element={<BoatOperatorEditPage />} />

      //admin
      <Route path='/admindashboard' element={<AdminDashboard />} />
      <Route path='/manageboatoperators/:boatoperatorid' element={<ManageBoatOperatorsPage />} />
      <Route path='/manageboats/:boatId' element={<ManageBoatsPage />} />
      <Route path='/ticketreview/:ticketId' element={<AdminTicketReview />} />
      <Route path='/onlinepayment/:boatId' element={<OnlinePaymentPage />} />
      <Route path='/manageuserrefunds/:refundId' element={<ManageRefundsPage />} />
      

      

  


     
    </Routes>
    
    
    
    


    
    </BrowserRouter>


      
   
      
    </>
  )
}

export default App
