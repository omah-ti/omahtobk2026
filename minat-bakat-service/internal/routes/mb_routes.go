package routes

import (
	"minat-bakat-service/internal/handlers"

	"github.com/gin-gonic/gin"
)

func InitializeRoutes(r *gin.Engine, mbHandler *handlers.MinatBakatHandler) {
	ping := r.Group("/ping")
	{
		ping.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})
	}

	mb := r.Group("/minat-bakat")
	// Auth middleware intentionally disabled for now.
	// mb.Use(utils.ValidateJWT())
	{
		mb.GET("/questions", mbHandler.GetQuestionsHandler)
		mb.POST("/process", mbHandler.ProcessMinatBakatHandler)
		mb.GET("/attempt", mbHandler.GetMinatBakatAttemptHandler)
		mb.GET("/attempts", mbHandler.GetMinatBakatAttemptHistoryHandler)
		mb.GET("/result/latest", mbHandler.GetLatestResultHandler)
	}
}
