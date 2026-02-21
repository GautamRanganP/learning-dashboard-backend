const axios = require("axios");
 
function fetchEmployee(userId, accessToken) {
  return axios.get(
    `${process.env.BASE_URL}/services/api/x/users/v2/employees/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  )
  .then(response => response)
  .catch(error => {
    console.error("Error fetching employee:", error.response?.data || error.message);
    throw error;
  });
}
 
function fetchTranscript(employee, accessToken) {
  return axios.get(
    `${process.env.BASE_URL}/services/api/TranscriptAndTask/Transcript?userId=${employee.data.data.externalId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  )
  .then(response => response)
  .catch(error => {
    console.error("Error fetching transcript:", error.response?.data || error.message);
    throw error;
  });
}

module.exports = { fetchEmployee ,fetchTranscript};