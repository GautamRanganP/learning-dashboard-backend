const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const { Redis } = require('@upstash/redis')
const {fetchTranscript,fetchEmployee} = require('./services/csodService')
const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
 
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = "all";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

app.get('/oauth/callback', async (req, res) => {
  const { authCode, state, sessionId } = req.query;
  if (!authCode || !state || !sessionId) {
    return res.status(400).send('Missing code, state, or sessionId parameter');
  }
  try {
    let accessToken;
    const cachedSession = await redis.get(sessionId);
    if (cachedSession) {
      const parsed = cachedSession;
      accessToken = parsed.accessToken;
      console.log("Using cached access token",accessToken);
    } else {
      const tokenResponse = await axios.post(
        `${process.env.BASE_URL}/services/api/oauth2/token`,
        {
          grantType: 'authorization_code',
          code: authCode,
          clientId,
          clientSecret,
          state,
          scope
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
 
      accessToken = tokenResponse.data.access_token;
      console.log(accessToken,accessToken)
      await redis.set(
        sessionId,
        JSON.stringify({ accessToken, state }),
        { ex: 3600 }
      );
    }
    const userInfoResponse = await axios.get(
      `${process.env.BASE_URL}/services/api/oauth2/userinfo`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
 
    const userInfo = userInfoResponse.data;
    const user = userInfo.data[0];
    const employee = await fetchEmployee(user, accessToken);

    const getCustomField = (id) => employee.data.data.customFields.find(field => field.id === id)?.value || null;
    const customField144 = employee.data.data.customFields.find(f => f.id === 144);
    const ouTypeId8 = employee.data.data.ous.find(o => o.typeId === 8);
  
    console.log("Grade:", customField144);
    console.log("ouTypeId8:", ouTypeId8);
    if (!ouTypeId8) {
      return res.status(400).render("error", {
        message: "Learning goals applicable solely to Grades 2 through 13."
      });
    }
    const gradeTitle = getGradeTitleByOuId(ouTypeId8.id);
    const jobstream = customField144
      ? getJOBSTREAM(customField144.value)
      : null;
    
// const jobstream = "TECH"


    const userDetails = {
      firstName: employee.data.data.firstName,
      lastName: employee.data.data.lastName,
      email: employee.data.data.userName,
      softwareLevel: getCustomField(145),
      designation: getCustomField(160),
      grade:gradeTitle,
      jobstream:jobstream   
    };  
 
    console.log("Grade:", gradeTitle);
    console.log("Jobstream:", jobstream);
    const match = gradeTitle?.match(/^G(\d{1,2})/);
    if (!match) {
      return res.status(403).render("error", {
        message: "Learning goals are not applicable for Mavericks."
      });
    }
    const gradeNumber = Number(match[1]);
    if (gradeNumber < 2 || gradeNumber > 13) {
      return res.status(403).render("error", {
        message: "Learning goals applicable solely to Grades 2 through 13."
      });
    }
 
    // const gradeNumber = 3;

    const transcriptData = await fetchTranscript(employee, accessToken);
    const transcripts = transcriptData.data.data[0]?.Transcripts || [];
    const ComplianceReport = checkComplianceById(transcripts);
    const totalTrainingHours = getCompletedSessionsWithTotalHours(transcripts);

    let GenAiReport = [];
    let tsrWithExternalCertification = [];


    const complainceCompletion = ComplianceReport.every(course => course.status === "Completed");
    const genaiCompletion = GenAiReport.some(course => course.status === "Completed");
    const learningHoursCompletion = totalTrainingHours.totalHours >= 20

    let rating
    let progressPercent 
    
 
    if (gradeNumber && gradeNumber >= 2 && gradeNumber <= 6 && jobstream === "TECH") {
      GenAiReport = checkGenAiCompliance(transcripts);
      tsrWithExternalCertification =
        fetchRootTitleAndTestLearningObjects(transcripts);

        if(complainceCompletion){
      rating = 2
      progressPercent = 25  
    }
    else if(complainceCompletion && genaiCompletion){
      rating = 3
      progressPercent = 50  
    } 
    else if(complainceCompletion && genaiCompletion && learningHoursCompletion){
      rating = 4
      progressPercent = 75  
    }
    else{
      rating = 1 
      progressPercent = 0 
    }

    }
    else{

      if(complainceCompletion){
      rating = 2
      progressPercent = 25  
    }
    else if(complainceCompletion){
      rating = 3
      progressPercent = 50  
    } 
    else if(complainceCompletion && learningHoursCompletion){
      rating = 4
      progressPercent = 75  
    }
    else{
      rating = 1 
      progressPercent = 0 
    }
    
    }
//  const completedGoals = goalsForYear.filter(g => g.isCompleted).length;
// const totalGoals = goalsForYear.length;
 



// const completedGoals =8;
// const totalGoals = 10;
// let progressPercent = 0;
 
// if (totalGoals > 0) {
//   progressPercent = Math.round((completedGoals / totalGoals) * 100);
// }
const progress = {
  complianceCompleted: complainceCompletion,
  baseTSRCount:0,
  genAICertCount:genaiCompletion,
  anyTSRCount:0,
  inPersonHours: totalTrainingHours.totalHours,
}
    const goalsForYear = buildGoals2026({progress},{user:{category:jobstream}})
    // console.log(goalsForYear)
    return res.render("dashboard", {
      userInfo,
      userDetails,
      rating,
      goalsForYear,
      progressPercent,
      complianceTrainings: ComplianceReport,
      genaiTraining: GenAiReport,
      totalHours: totalTrainingHours.totalHours,
      completedTrainings: totalTrainingHours.completedTrainings,
      tsrData: tsrWithExternalCertification,
      grade: gradeTitle,
      jobstream
    });
 
  } catch (error) {
  if (error.response) {
  console.error("Response data:", error.response.data);
  console.error("Status:", error.response.status);
} else if (error.request) {
  console.error("No response received:", error. Request);
}
    return res.status(500).send(
      "OAuth token exchange or data retrieval failed"
    );
  }
});

const JOBSTREAM = {
  "103": "TECH",
  "104": "MKTS",
  "105": "BPS",
  "106": "SUPP"
};




// Function to get Grade title by ou_id
function getGradeTitleByOuId(ouId) {
  const grades = [
    { ou_id: 130, title: "G5" },
    { ou_id: 131, title: "G6" },
    { ou_id: 132, title: "G7" },
    { ou_id: 133, title: "G8" },
    { ou_id: 134, title: "G9" },
    { ou_id: 179, title: "G10" },
    { ou_id: 180, title: "G11" },
    { ou_id: 181, title: "G12" },
    { ou_id: 182, title: "G13" },
    { ou_id: 189, title: "G2" },
    { ou_id: 192, title: "G3" },
    { ou_id: 195, title: "G4" },
  ];

  const grade = grades.find(g => g.ou_id === ouId);
  return grade ? grade.title : null;
}


const requiredCourses = [
  { id: "9dc4632f-ab45-401b-b816-d010da033ef3", name: "Information Security and Data Privacy - 2026" },
  { id: "ca27d0ce-5c55-4be1-8163-2a5ff0d92195", name: "Environmental, Social and Governance - 2026" },
  { id: "3062cfb7-b85b-4ee0-b275-0b766df23f55", name: "Phishing Awareness Training - 2026" },
  { id: "b381c0b3-221c-434d-8fb9-86d1db119735", name: "Anti-bribery & Anti-corruption (ABAC) 2026" },
  { id: "89d1b977-39bc-4c32-90cf-f25746638afc", name: "Prevention of Sexual Harassment - 2026" },
  { id: "4336265c-e52d-4d81-b2f4-8bea35e633b7", name: "Code of Conduct - 2026" },
  { id: "b0549801-1534-4100-84dc-f1a94315a287", name: "Social Media Policy - 2026" },
  { id: "48fa0468-9136-4f71-8532-b4b2ea30ae2b", name: "Unconscious Bias - 2026" }
];

function buildGoals2026(progress, user) {
  console.log(user)
  if (user.user.category !== "TECH") {
    return [
      {
        title: '100% of all compliance courses',
        isCompleted: progress.progress.complianceCompleted
      },
      {
        title: '20 hours of in-person learning',
        isCompleted: progress.progress.inPersonHours >= 20
      }
    ];
  }
 
  // TECH
  return [
    {
      title: '100% of all compliance courses',
      isCompleted: progress.progress.complianceCompleted
    },
    {
      title: 'One advanced External Certification(Base TSR)',
      isCompleted: progress.progress.baseTSRCount >= 1
    },
    {
      title: 'One Gen AI external certification / Gen AI Honors',
      isCompleted: progress.progress.genAICertCount
    },
    {
      title: 'One advanced External Certification(Any TSR)',
      isCompleted: progress.progress.anyTSRCount >= 1
    },
    {
      title: '20 hours of in-person learning',
      isCompleted: progress.progress.inPersonHours >= 20
    }
  ];
}


function checkComplianceById(transcriptCourses) {
  
  return requiredCourses.map(course => {
    const courseRecord = transcriptCourses.find(c => c.LoId === course.id);
    let status = 'In-Progress';

    if (courseRecord) {
      if (courseRecord.Status === 'Completed') {
        status = 'Completed';
      } else if (courseRecord.Status === 'In Progress') {
        status = 'In-Progress';
      }
    }

    return {
      complianceId: course.id,
      complianceName: course.name,
      status: status
    };
  });
}

const genAiCourses = [
  { id: "1be3a51b-d6fc-4610-921b-c0468bdc1c17", name: "Generative AI 2026" },
  { id: "96ae3787-694f-435a-9dca-73870890c6dc", name: "AI/Gen AI Honors" }
];

function checkGenAiCompliance(transcriptCourses) {
  return genAiCourses.map(course => {
    const courseRecord = transcriptCourses.find(c => c.LoId === course.id);
    let status = 'In Progress';
    if (courseRecord) {
      if (courseRecord.Status === 'Completed') {
        status = 'Completed';
      } else if (courseRecord.Status === 'In Progress') {
        status = 'In-Progress';
      }
    }

    return {
      complianceId: course.id,
      complianceName: course.name,
      status: status
    };
  });
}

function getCompletedSessionsWithTotalHours(transcriptItems) {
  let totalMinutes = 0;
  const completedTrainings = [];

  transcriptItems.forEach(item => {
    if (item.Status === 'Completed' && item.LoType === 'Session' && item.TrainingHours) {
      const parts = item.TrainingHours.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        totalMinutes += (hours * 60) + minutes;

        completedTrainings.push({
          LoId: item.LoId,
          Title: item.Title,
          TrainingHours: item.TrainingHours,
          StartDateTime: item.StartDateTime,
          EndDateTime: item.EndDateTime,
          Status:item.Status
        });
      }
    }
  });

  const totalHours = totalMinutes / 60;

  return {
    totalHours,
    completedTrainings
  };
}
// function calculateCompletedSessionTrainingHours(transcriptItems) {
//   let totalMinutes = 0;
//   transcriptItems.forEach(item => {
//     if (item.Status === 'Completed' && item.LoType === 'Session' && item.TrainingHours) {
//       // TrainingHours format: "HHHH:MM:SS"
//       console.log("training object",item)
//       const parts = item.TrainingHours.split(':');
//       if (parts.length === 3) {
//         const hours = parseInt(parts[0], 10);
//         const minutes = parseInt(parts[1], 10);
//         totalMinutes += (hours * 60) + minutes;
//       }
//     }
//   });
//   const totalHours = Math.floor(totalMinutes / 60);
//   const remainingMinutes = totalMinutes % 60;
//   const formattedMinutes = remainingMinutes.toString().padStart(2, '0');
//   return `${totalHours}:${formattedMinutes}`;
// }

function timeToDecimalHours(timeStr) {
  // Fix or extract parts from the input (assuming HHMM:SS)
  // If input is "0000:30:00", treat first 4 digits as HHMM?
  // Let's assume first 2 digits are hours, next 2 digits are minutes, then seconds

  // Parse hours and minutes separately assuming "HHMM:SS"
  const [hhmm, ss] = timeStr.split(':');
  if (!hhmm || !ss) return 0;

  // Extract hours and minutes from hhmm
  const hours = parseInt(hhmm.slice(0, 2), 10);
  const minutes = parseInt(hhmm.slice(2, 4), 10);

  if (isNaN(hours) || isNaN(minutes)) return 0;

  return hours + (minutes / 60);
}
function getJOBSTREAM(code) {
  return JOBSTREAM[code] || null; // Returns null if code not found
}
async function fetchEmployeeAndTranscript(employeeId, bearerToken) {
  const employeeUrl = `${process.env.BASE_URL}/services/api/x/users/v2/employees/employees?id=${employeeId}`;
  try {
    const employeeResponse = await axios.get(employeeUrl, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    const employeeData = employeeResponse.data;
    const transcriptUrl = `${process.env.BASE_URL}/services/api/TranscriptAndTask/Transcript?userId=${employeeData.data.externalId}`;

    const transcriptResponse = await axios.get(transcriptUrl, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    const transcriptData = transcriptResponse.data;
    return {
      employee: employeeData,
      transcript: transcriptData,
    };
  } catch (error) {
    console.error('Error fetching data:', error.response ? error.response.data.error.fields[0].errors : error.message.error.fields);
    // throw error;
  }
}
function fetchRootTitleAndTestLearningObjects(transcripts) {
  console.log(transcripts)
  const rootCurriculum = transcripts.find(item => 
    item.LoType === "Curriculum" &&
    item.ProviderName === "Hexavarsity Online" &&
    item.LoProviderId &&
    /_sn?2\.0_/i.test(item.LoProviderId)
  );

  if (!rootCurriculum) {
    return null; 
  }

  const tsrTitle = rootCurriculum.Title;
  const tsrId = rootCurriculum.LoId;

  // Filter LearningObjects to include only those with LoType "Test"
const filteredTests = (rootCurriculum.LearningObjects || []).filter(
  (lo) => lo.LoType === "Test" && (lo.Status === "Registered" || lo.Status === "Completed")
);

  return {
    tsrTitle,
    tsrId,
    certifications: filteredTests,
  };
}



app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});