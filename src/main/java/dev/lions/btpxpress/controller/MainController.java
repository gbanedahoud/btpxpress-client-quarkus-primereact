package dev.lions.btpxpress.controller;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MainController {
  private static final Logger logger = LoggerFactory.getLogger(MainController.class);

  @GET
  @Path("/health")
  @Produces(MediaType.APPLICATION_JSON)
  public Response health() {
    logger.debug("Performing health check");

    Map<String, Object> healthStatus = new HashMap<>();
    healthStatus.put("status", "UP");
    healthStatus.put("timestamp", LocalDateTime.now());

    return Response.ok(healthStatus).build();
  }

  @GET
  @Path("/version")
  @Produces(MediaType.APPLICATION_JSON)
  public Response getVersion() {
    Map<String, String> version = new HashMap<>();
    version.put("version", "1.0.0");
    version.put("environment", System.getProperty("quarkus.profile", "development"));

    return Response.ok(version).build();
  }

  @GET
  @Path("/secured")
  @Authenticated
  @Produces(MediaType.APPLICATION_JSON)
  public Response getSecuredEndpoint() {
    Map<String, String> response = new HashMap<>();
    response.put("message", "This is a secured endpoint");

    return Response.ok(response).build();
  }

  @OPTIONS
  @Path("{path : .*}")
  public Response options() {
    return Response.ok()
                   .header("Access-Control-Allow-Origin", "*")
                   .header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
                   .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                   .header("Access-Control-Max-Age", "86400")
                   .build();
  }
}