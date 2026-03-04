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
      console.log("New access token");
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
 console.log("tokenResponse",tokenResponse)
      accessToken = tokenResponse.data.access_token;
      console.log("accessToken",accessToken)
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
      const userDetails = {
      firstName: employee.data.data.firstName,
      lastName: employee.data.data.lastName,
      email: employee.data.data.userName,
      softwareLevel: getCustomField(145),
      designation: getCustomField(160),
      baseTsrCode:getCustomField(1160),
      grade:gradeNumber,
      jobstream:jobstream   
    };  

    const transcriptData = await fetchTranscript(employee, accessToken);
    const transcripts = transcriptData.data.data[0]?.Transcripts || [];
    const ComplianceReport = checkComplianceById(transcripts);
    const complianceCompletionCount = ComplianceReport.filter(compliance => compliance.status === "Completed").length;
    const totalTrainingHours = getCompletedSessionsWithTotalHours(transcripts);

    let GenAiReport = [];
    let tsrWithExternalCertification = [];

    // const learningHours = totalTrainingHours.totalHours
    const learningHours = 10

    const complainceCompletion = ComplianceReport.every(course => course.status === "Completed");
    const tenHourslearningCompletion = learningHours >= 10
    const fiftteenHourslearningCompletion = learningHours >= 15
    const twentyHourslearningCompletion = learningHours >= 20 
    let completedAndAdvancedCount = 0
    let genaiCompletion = false
    let rating
    let progressPercent 
    let genAiCompletionCount = 0
 
    if (gradeNumber && gradeNumber >= 2 && gradeNumber <= 6 && jobstream === "TECH") {
      GenAiReport = checkGenAiById(transcripts);
      genAiCompletionCount = GenAiReport.filter(genai => genai.status === "Completed").length;
      const tsrWithExternalCertificationDynamic = fetchRootTitleAndTestLearningObjects(transcripts,userDetails.baseTsrCode)
      
      if(tsrWithExternalCertificationDynamic && tsrWithExternalCertificationDynamic.length ){
        tsrWithExternalCertificationDynamic.forEach((tsr)=>tsrWithExternalCertification.push(tsr))
      }
//       const mockCertification = [
//   {
//   tsrTitle: 'Back End Developer',
//   tsrId: 'abc123',
//   LoProviderId:'S2.0_ATM_AFD',
//   certifications: [
//     {
//       DueDate: null,
//       ItemSequence: 1,
//       LoId: 'xyz789',
//       LoTrainingHours: '0080:00:00',
//       LoType: 'Test',
//       ParentLoId: 'parent123',
//       Status: 'Completed',
//       Title: 'AWS Solutions Architect',
//       Complexity: 'Advanced'
//     }
//   ]},
//   {
//   tsrTitle: 'Front End Developer',
//   tsrId: 'abc123',
//   LoProviderId:'130518_S2.0_CXT_DXD',
//   certifications: [
//     {
//       DueDate: null,
//       ItemSequence: 1,
//       LoId: 'xyz789',
//       LoTrainingHours: '0080:00:00',
//       LoType: 'Test',
//       ParentLoId: 'parent123',
//       Status: 'Completed',
//       Title: 'AWS Solutions Developer',
//       Complexity: 'Advanced'
//     }
//   ]}
// ]
// mockCertification.forEach((tsr)=>tsrWithExternalCertification.push(tsr))


    genaiCompletion = GenAiReport.some(course => course.status === "Completed");
    completedAndAdvancedCount = tsrWithExternalCertification.reduce((total, tsr) => {
      const count = tsr.certifications.filter(cert => cert.Status === 'Completed' && cert.Complexity === 'Advanced').length;
      return total + count;
    }, 0);
      if(complainceCompletion && twentyHourslearningCompletion && genaiCompletion && completedAndAdvancedCount > 1){
        rating = 5
        progressPercent = 100 
      }
      else if(complainceCompletion && fiftteenHourslearningCompletion && genaiCompletion && completedAndAdvancedCount > 0){
        rating = 4
        progressPercent = 80  
      } 
      else if(complainceCompletion && tenHourslearningCompletion  && completedAndAdvancedCount > 0){
        rating = 3
        progressPercent = 60 
      }
      else if(complainceCompletion || tenHourslearningCompletion || completedAndAdvancedCount > 0 || genaiCompletion){
       rating = 2
       progressPercent = 40
      }
      else{
        rating = 1 
        progressPercent = 0 
      }
    }
    else{
      if(complainceCompletion && twentyHourslearningCompletion){
        rating = 5
        progressPercent = 100
      }
      else if(complainceCompletion && fiftteenHourslearningCompletion){
        rating = 4
        progressPercent = 75  
      } 
      else if(complainceCompletion && tenHourslearningCompletion){
        rating = 3
        progressPercent = 50 
      }
      else if(complainceCompletion || tenHourslearningCompletion){
        rating = 2
        progressPercent = 25
      }
      else{
        rating = 1 
        progressPercent = 0 
      }
    }

 console.log("rating",rating,progressPercent)
console.log("completedAndAdvancedCount",completedAndAdvancedCount)
const progress = {
  complianceCompleted: complainceCompletion,
  baseTSRCount:completedAndAdvancedCount,
  genAICertCount:genaiCompletion,
  anyTSRCount:completedAndAdvancedCount,
  inPersonHours: learningHours,
}
const completionCount = {
  complaince:complianceCompletionCount,
  genai:genAiCompletionCount,
  advancedCertificateCount:completedAndAdvancedCount,
  inPersonHours:learningHours,
}
console.log("progress",progress)

    const goalsForYear = buildGoals2026({progress},{user:{category:jobstream}},completionCount)
    console.log("goalsForYear",goalsForYear)
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
      uniqueKeywords:totalTrainingHours.uniqueKeywords,
      tsrWithExternalCertification: tsrWithExternalCertification,
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
console.log(error)
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

function buildGoals2026(progress, user,completion) {
  console.log("completion",completion)
  if (user.user.category !== "TECH") {
    return [
      {
        title: '100% of all compliance courses',
        isCompleted: progress.progress.complianceCompleted,
        count:8,
        completion: Math.min(completion.complaince,8),
      },
      {
        title: '20 hours of in-person learning',
        isCompleted: progress.progress.inPersonHours >= 20,
        count:20,
        completion: Math.min(progress.progress.inPersonHours,20),
      }
    ];
  }
 
  // TECH
  return [
    {
      title: '100% of all compliance courses',
      isCompleted: progress.progress.complianceCompleted,
      count:8,
      completion: Math.min(completion.complaince,8),
    },
    {
      title: 'One advanced External Certification(Base TSR)',
      isCompleted: progress.progress.baseTSRCount > 0,
      count:1,
      completion: Math.min(progress.progress.baseTSRCount, 1)
    },
    {
      title: 'One Gen AI external certification / Gen AI Honors',
      isCompleted: progress.progress.genAICertCount,
      count:1,
      completion: Math.min(completion.genai,1),
    },
    {
      title: 'One advanced External Certification(Any TSR)',
      isCompleted: progress.progress.anyTSRCount > 1,
      count:1,
      completion: Math.min(progress.progress.anyTSRCount,1)
    },
    {
      title: '20 hours of in-person learning',
      isCompleted: progress.progress.inPersonHours >= 20,
      count:20,
      completion: Math.min(progress.progress.inPersonHours,20)
    }
  ];
}


function checkComplianceById(transcriptCourses) {
  
  return requiredCourses.map(course => {
    const courseRecord = transcriptCourses.find(c => c.LoId === course.id);
    let status = 'Completed';

    if (courseRecord) {
      if (courseRecord.Status === 'Completed') {
        status = 'Completed';
      } else if (courseRecord.Status === 'In Progress') {
        status = 'Completed';
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

function checkGenAiById(transcriptCourses) {
  return genAiCourses.map(course => {
    const courseRecord = transcriptCourses.find(c => c.LoId === course.id);
    let status = 'Completed';
    if (courseRecord) {
      if (courseRecord.Status === 'Completed') {
        status = 'Completed';
      } else if (courseRecord.Status === 'In Progress') {
        status = 'Completed';
      }
    }

    return {
      complianceId: course.id,
      complianceName: course.name,
      status: status
    };
  });
}

function extractKeyword(loProviderId) {
  if (!loProviderId || typeof loProviderId !== 'string') return 'Other';

  const parts = loProviderId.split('_').map(p => p.toUpperCase()); // Normalize case for search

  // Find index of part containing 'ILT' or 'VILT'
  const iltIndex = parts.findIndex(part => part.includes('ILT') || part.includes('VILT'));

  // If found and next element exists, return next element
  if (iltIndex !== -1 && iltIndex + 1 < parts.length) {
    return parts[iltIndex + 1];
  }

  // If ILT/VILT not found, classify as 'Other'
  return 'Other';
}

function getCompletedSessionsWithTotalHours(transcriptItems,excludeStrings = ['BQ']) {
  let totalMinutes = 0;
  const completedTrainings = [];

  transcriptItems.forEach(item => {
    if (item.Status === 'Completed' && item.LoType === 'Session' && item.TrainingHours) {
      
      
      const containsExcluded = excludeStrings.some(excludeStr =>
        item.LoProviderId.includes(excludeStr)
      );

      if (containsExcluded) {
        return;
      }
      const parts = item.TrainingHours.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        totalMinutes += (hours * 60) + minutes;

        completedTrainings.push({
          LoId: item.LoId,
          Title: item.Title,
          TrainingHours: item.TrainingHours,
          StartDateTime: formatISODateTimeCombined(item.StartDateTime),
          EndDateTime: formatISODateTimeCombined(item.EndDateTime),
          Status: item.Status,
          LoProviderId: item.LoProviderId,
          keyword: extractKeyword(item.LoProviderId)
        });
      }
    }
  });

  const uniqueKeywordsSet = new Set(completedTrainings.map(t => t.keyword));
  const uniqueKeywords = Array.from(uniqueKeywordsSet);

  const totalHours = totalMinutes / 60;

  return {
    totalHours,
    completedTrainings,
    uniqueKeywords
  };
}

function formatISODateTimeCombined(isoString) {
  // Fix timezone format to ISO standard (add colon in timezone)
  const fixedIso = isoString.replace(/([+\-]\d{2})(\d{2})\$/, "\$1:\$2");
  const date = new Date(fixedIso);

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"],
          v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  const day = date.getDate();
  const ordinal = getOrdinal(day);
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;

  return `${day}${ordinal}-${month}-${year} ${hours}:${minutes} ${ampm}`;
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
function fetchRootTitleAndTestLearningObjects(transcripts, baseTsr) {
  // Filter all matching root curricula
  const rootCurricula = transcripts.filter(item => 
    item.LoType === "Curriculum" &&
    item.ProviderName === "Hexavarsity Online" &&
    item.LoProviderId &&
    /_sn?2\.0_/i.test(item.LoProviderId)
  );

  if (rootCurricula.length === 0) {
    return null; 
  }

  // Map each root curriculum to an object with required info
  const results = rootCurricula.map(rootCurriculum => {
    const tsrTitle = rootCurriculum.Title;
    const tsrId = rootCurriculum.LoId;
    const LoProviderId = rootCurriculum.LoProviderId;

    const filteredTests = (rootCurriculum.LearningObjects || [])
      .filter(
        lo => lo.LoType === "Test" && 
          (lo.Status === "Registered" || lo.Status === "In Progress" || lo.Status === "Completed")
      )
      .map(lo => {
        const trainingHoursStr = lo.LoTrainingHours ? lo.LoTrainingHours.substring(0, 4) : "0000";
        const trainingHours = parseInt(trainingHoursStr, 10) || 0;

        let level = null;
        if (trainingHours >= 150) {
          level = "Advanced";
        } else if (trainingHours >= 40) {
          level = "Basic";
        }

        return {
          ...lo,
          Complexity: level,
        };
      });

    return {
      tsrTitle,
      tsrId,
      LoProviderId,
      isBase: baseTsr ? LoProviderId.includes(baseTsr) : false,
      certifications: filteredTests,
    };
  });

  return results;
}


app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});