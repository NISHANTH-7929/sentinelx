const getVerificationStatus = (confidence) => {
  if (confidence >= 0.8) {
    return 'verified';
  }

  if (confidence >= 0.4) {
    return 'pending';
  }

  return 'rejected';
};

module.exports = {
  getVerificationStatus
};
