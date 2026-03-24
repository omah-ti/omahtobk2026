package services

import "errors"

var (
	ErrAuthContextInvalid    = errors.New("invalid auth context")
	ErrAttemptNotFound       = errors.New("tryout attempt not found")
	ErrAttemptAlreadyOngoing = errors.New("user already has an ongoing attempt")
	ErrAttemptEnded          = errors.New("tryout attempt has ended")
	ErrAttemptNotOngoing     = errors.New("tryout attempt is not ongoing")
	ErrNoActiveSubtest       = errors.New("no active subtest found")
	ErrTimeLimitReached      = errors.New("time limit has been reached for this subtest")
	ErrInvalidAnswerPayload  = errors.New("invalid answer payload")
	ErrScoringFailed         = errors.New("failed to calculate or store score")
)
