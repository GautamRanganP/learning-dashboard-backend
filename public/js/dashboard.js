
// POLICY MODAL
const openPolicy = document.getElementById("openPolicy");
const policyOverlay = document.getElementById("policyOverlay");
const closePolicy = document.getElementById("closePolicy");

openPolicy.onclick = ()=>policyOverlay.style.display="flex";
closePolicy.onclick = ()=>policyOverlay.style.display="none";
policyOverlay.onclick = (e)=>{if(e.target===policyOverlay) policyOverlay.style.display="none";}


// const root = document.getElementById("dashboardRoot");
 
// const userInfo = JSON.parse(root.dataset.user);
 
// console.log(userInfo);
// let activeYear = 2025;

// const user = { name:'', grade:'', category:'', rating:0 };

// let goalsByYear = {};


// const allUsers = [...techUser, ...nonTechUser];

// const loader = document.getElementById("dashboardLoader");
// const mainEl = document.getElementById("main-content-lg");


// // function showLoader() {
// //   loader.style.display = "flex";
// //   mainEl.style.display = "none";
// // }
// function hideLoader() {
//   loader.style.display = "none";
//   mainEl.style.display = "block";
// }

 
// /* ---- UI HELPERS ---- */
// function showError(msg){
//   const errorBox = document.getElementById("errorBox");
//   const errorMessage = document.getElementById("errorMessage");
//   errorMessage.innerHTML = msg;  
//   errorBox.style.display = "flex"; 
//   // document.getElementById("tabsSection").style.display="none";
//   document.getElementById("learningProgressSection").style.display="none";
//   document.getElementById("ratingSummarySection").style.display="none";
// }
// function clearError() {
//   const errorBox = document.getElementById("errorBox");
//   errorBox.style.display = "none";

//   // Show sections again
//   document.getElementById("learningProgressSection").style.display = "";
//   document.getElementById("ratingSummarySection").style.display = "";
//   // Optionally uncomment if you want to show tabs section again
//   // document.getElementById("tabsSection").style.display = "";
// }

// function getRatingLabel(r){
//   if(r<=1) return 'Unsatisfactory';
//   if(r<=2) return 'Needs Improvement';
//   if(r===3) return 'Meets Expectation';
//   if(r===4) return 'Exceeds Expectation';
//   return 'Exceptional';
// }

// function renderStars(r){
//   return Array.from({length:5},(_,i)=>
//     `<span class="${i<r?'filled':''}">★</span>`
//   ).join('');
// }

// function computeGoals(){
//   return (goalsByYear[activeYear]||[]).map(g=>{
//     let status='pending';
//     if(g.optional) status='waived';
//     else if(g.isCompleted) status='completed';
//     return {...g,status};
//   });
// }

// function render() {
//   // document.getElementById("activeYearText").innerText = activeYear;

//   // // Rating summary only for 2025
//   // document.getElementById("ratingSummarySection").style.display =
//   //   activeYear === 2025 ? "block" : "none";

//   // document.getElementById("userName").innerText = user.name;
//   // document.getElementById("userMeta").innerText =
//   //   `Grade ${user.grade} · ${user.category}`;

//   // // rating comes validated from API (1–5)
//   // document.getElementById("stars").innerHTML = renderStars(user.rating);
//   // document.getElementById("ratingNumber").innerText = `${user.rating} / 5`;

//   // document.getElementById("ratingLabel").innerText =
//   //   getRatingLabel(user.rating);

//   // // progress directly tied to rating
//   // const pct = (user.rating / 5) * 100;
//   // document.getElementById("progressFill").style.width = pct + "%";
//   // document.getElementById("progressPercent").innerText = pct + "%";

//   document.getElementById("goalCards").innerHTML =
//     computeGoals().map(g => `
//       <div class="goal-card ${g.status}">
//         ${g.status === 'waived'
//           ? '<span class="waived-tag">Waived</span>'
//           : ''}
//         <p>${g.title}</p>
//       </div>
//     `).join('');
// }


// function isGradeNotGreaterThanG6(title) {
//   console.log(title)
//   // Extract digit(s) after 'G' (assuming format like 'G3', 'G10', etc.)
//   const match = title.match(/G(\d+)/);
//   if (!match) return false; // If format unexpected, treat as invalid or false

//   const gradeNumber = Number(match[1]);
//   return gradeNumber <= 6;
// }
// function setGoalsByYear(userData, activeYear) {
//   let goalsForYear = [];
//   console.log(user)
//   if ((activeYear === 2025 && user.category !== "TECH") || ((activeYear === 2026  && !isGradeNotGreaterThanG6(userData.title)|| user.category !== "TECH"))) {
//     if (activeYear === 2025) {
//       goalsForYear = [
//         { title: '100% of all compliance courses', isCompleted: userData["Compliance trainings"] === "Yes", optional: userData["Compliance trainings"] === "Not Applicable" },
//         { title: 'Gen AI advanced for Non Tech', isCompleted: userData["Gen AI advanced for non Tech"] === "Yes", optional: userData["Gen AI advanced for non Tech"] === "Not Applicable" },
//         { title: '12 Hours of Learning', isCompleted: userData["Total learning hours >=12(O+P+Q+R)"] === "Yes", optional: userData["Total learning hours >=12(O+P+Q+R)"] === "Not Applicable" }
//       ];
//     } else if (activeYear === 2026) {
//       goalsForYear = [
//         { title: '100% of all compliance courses', isCompleted: false },
//         { title: '20 hours of in-person learning', isCompleted: false }
//       ];
//     }
//   } else { // TECH category
//     if (activeYear === 2025) {
//       goalsForYear = [
//         { title: '100% of all compliance courses', isCompleted: userData["100% Compliance trainings"] === "Yes", optional: userData["100% Compliance trainings"] === "Not Applicable" },
//         { title: 'Gen AI advanced for Tech', isCompleted: userData["Gen AI advanced for Tech"] === "Yes", optional: userData["Gen AI advanced for Tech"] === "Not Applicable" },
//         { title: 'One advanced certification from base TSR (Recommended)', isCompleted: userData["One advanced certification from base TSR"] === "Yes" || userData["One advanced certification from any TSR"] === "Yes", optional: userData["One advanced certification from base TSR"] === "Not Applicable" },
//         { title: 'One advanced certification from any TSR', isCompleted: userData["More than one advance certification from any TSR"] === "Yes", optional: userData["One advanced certification from any TSR"] === "Not Applicable" },
//         { title: 'Gen AI Honors', isCompleted: userData["Gen AI Honors"] === "Yes", optional: userData["Gen AI Honors"] === "Not Applicable" }
//       ];
//     } else if (activeYear === 2026) {
//       goalsForYear = [
//         { title: '100% of all compliance courses', isCompleted: false },
//         { title: 'One advanced External Certification(Base TSR)', isCompleted: false },
//         { title: 'One Gen AI external certification / Gen AI Honors', isCompleted: false },
//         { title: 'One advanced External Certification(Any TSR)', isCompleted: false },
//         { title: '20 hours of in-person learning', isCompleted: false }
//       ];
//     }
//   }

//   // Override for specific grade
//   if (user.grade === "G7(AS per new Grade)" && activeYear === 2026) {
//     goalsForYear = [
//       { title: '100% of all compliance courses', isCompleted: false },
//       { title: '20 hours of in-person learning', isCompleted: false }
//     ];
//   }

//   return goalsForYear;
// }

// function normalizeStatus(status) {
//       return status.toLowerCase().replace(/\s/g, '-');
//     }

//     // Render cards into a container
//     function renderCards(data, containerId) {
//       const container = document.getElementById(containerId);
//       container.innerHTML = ''; // clear existing

//       data.forEach(item => {
//         // Only show Completed or In-Progress
//         const statusNorm = normalizeStatus(item.status);
//         if (!['completed', 'in-progress', 'in-progress'].includes(statusNorm)) return;

//         const card = document.createElement('div');
//         card.classList.add('card');
//         card.innerHTML = `
//           <h3>${item.complianceName}</h3>
//           <div class="ribbon ${statusNorm}">${item.status.toUpperCase()}</div>
//           <div class="completion-date" aria-label="Completion Date">
//             <!-- Add completion date here later -->
//           </div>
//         `;
//         container.appendChild(card);
//       });
//     }

//     function init(year = activeYear) {
//     // showLoader()
    
//      let userData;

//     const sectionEL = document.querySelector('#main-section')
//     if (year === 2025) {
//         userData = allUsers.find(
//             u => String(u.CORNERSTONE_ID) === String(userInfo.data[0])  // your existing 2025 check
//         );
//         sectionEL.style.display = "none"
//         console.log(userData)
//     } else if (year === 2026) {
//         userData = allEmployee.find(
//             u => String(u.user_id) === String(userInfo.data[0])  // example: different ID for 2026
//         );
//         sectionEL.style.display = "block"
//         // renderCards(complianceTrainings, 'compliance-grid');
//         // renderCards(genAITrainings, 'genai-grid');
//     }
//     activeYear = year; // update global activeYear

   
//     if (!userData) {
//       hideLoader()
//       showError(`You are <strong>not eligible</strong> for learning goals in <strong>${year}</strong>.<br/>
//       Please contact <a href="mailto:askvarsity@hexaware.com" style="color: #991b1b; text-decoration: underline;">askvarsity@hexaware.com</a> for further clarification.`);
//       return;
//     }

//     user.name = userData.EMPLOYEE_NAME || 'Default';
//     user.grade = userData.GRADE || userData.title;
//     user.category = userData.CATEGORY || userData.department;
//     user.rating = Number(userData?.Ratings?.match(/\d+/)?.[0]) || 0;
//     goalsByYear = {}; // reset or initialize
  
//     goalsByYear[activeYear] = setGoalsByYear(userData, activeYear);

//   if (!goalsByYear[activeYear] || goalsByYear[activeYear].length === 0) {
//     hideLoader()
//     showError(`You are <strong>not eligible</strong> for learning goals in <strong>${activeYear}</strong>.<br/>
//     Please contact <a href="mailto:askvarsity@hexaware.com" style="color: #991b1b; text-decoration: underline;">askvarsity@hexaware.com</a> for further clarification.`);
//     return;
//   }

//     render();
//     hideLoader()
// }

// document.addEventListener('DOMContentLoaded', () => {
//   const userViewable = [4986];
//   const userAccess = document.querySelector('#learning-dashboard-grp');
//   // const iframeEL = document.getElementById("ctl00_ContentPlaceHolder1_widgetLayout_rptWidgets_ctl01_widgetContainer_ctl00_iframeExternal");

//   const currentUserId = userInfo?.data?.[0];
//   const currentUserIdNum = Number(currentUserId);

//   console.log('Current User ID:', currentUserIdNum); // For debugging

//   if (userAccess && !isNaN(currentUserIdNum)) {
//     if (userViewable.includes(currentUserIdNum)) {
//       userAccess.style.display = 'block';
//       // iframeEL.style.display = "block"
//        init(2025)
//     } else {
//       userAccess.style.display = 'none';
//        init(2025)
//     }
//   }
 
// });


// /* Tabs */
// document.querySelectorAll('.tab').forEach(tab => {
//   tab.onclick = () => {
//     const year = Number(tab.dataset.year);
//      clearError();
//     activeYear = year;
//     document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
//     tab.classList.add('active');

//     const legendgrp = document.querySelector('.legend-grp');
//     if (activeYear === 2026) {
//       legendgrp.style.display = 'none';
//     } else {
//       legendgrp.style.display = '';
//     }

//     const goalCards = document.querySelector('.goal-cards');
//     if (activeYear === 2026) {
//       goalCards.classList.add('just-display');
//     } else {
//       goalCards.classList.remove('just-display');
//     }

//     init(activeYear);  // re-init for the selected year
//   }
// });