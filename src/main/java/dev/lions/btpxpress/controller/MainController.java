package dev.lions.btpxpress.controller;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api")
public class MainController {

  @GET
  @Path("/health")
  @Produces(MediaType.TEXT_PLAIN)
  public String health() {
    return "OK";
  }
}