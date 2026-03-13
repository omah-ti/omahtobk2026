package routes

import (
	"tryout-service/internal/handlers"
	"tryout-service/internal/utils"

	"github.com/gin-gonic/gin"
)

func InitializeRoutes(r *gin.Engine, tryoutHandler *handlers.TryoutHandler, pageHandler *handlers.PageHandler) {
	ping := r.Group("/ping")
	{
		ping.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}

	tryout := r.Group("/tryout")
	tryout.Use(utils.ValidateJWT())
	{
		tryout.POST("/start-attempt/:paket", tryoutHandler.StartAttempt)
		tryout.GET("/pembahasan", pageHandler.GetPembahasanPageHandler)
		tryout.GET("/leaderboard", pageHandler.GetLeaderboardHandler)
		tryout.GET("/subtests-score", pageHandler.GetUserSubtestsScore)
		tryout.GET("/ongoing-attempts", pageHandler.GetOngoingAttemptHandler)
		tryout.GET("/finished-attempt", pageHandler.GetFinishedAttemptHandler)
	}

	sync := tryout.Group("/sync")
	{
		sync.POST("", tryoutHandler.SyncHandler)
		sync.POST("/progress", tryoutHandler.ProgressTryoutHandler)
		sync.POST("/finish", tryoutHandler.FinishTryoutHandler)
		sync.GET("/current", tryoutHandler.GetCurrentAttempt)
	}
}
