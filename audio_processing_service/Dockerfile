# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the helper and main application files
COPY audio_ops.py .
COPY align.py .
COPY transitions.py .
COPY main.py .

# Make port 8001 available to the world outside this container
EXPOSE 8001

# Define environment variables (can be overridden)
ENV PORT=8001
ENV SUPABASE_URL=""
ENV SUPABASE_SERVICE_ROLE_KEY=""

# Run main.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
